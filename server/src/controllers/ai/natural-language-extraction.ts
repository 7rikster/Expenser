import { GoogleGenerativeAI } from "@google/generative-ai";
import { Request, Response, NextFunction } from "express";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const naturalLanguageExtraction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    /* 1️⃣ Auth */
    const { userId: clerkUserId } = req.auth();

    if (!clerkUserId) {
      return next(
        res.status(401).json({
          status: "error",
          msg: "Unauthorized",
        })
      );
    }
    
    const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});
    const {input} = req.body;

    if (!input) {
      return res.status(400).json({
        status: "error",
        msg: "No input provided",
      });
    }
    const now = new Date();

    const localDate = now.toLocaleDateString("en-CA"); 


    const prompt = `
    Current local date: ${localDate}
    Analyze this expense or income input and extract structured data.

    Rules:
    - Resolve relative dates like:
      - today
      - yesterday
      - day before yesterday
      - last monday
      - this morning
      using the current date provided above.
    - Return the date in ISO 8601 format.
    - If no date is mentioned, return an empty string.
    - Amount should only contain the numeric value.
    - If the input indicates expense, set type to "EXPENSE".
    - Expense Category must be one of:
      housing, transportation, groceries, utilities,
      entertainment, food, shopping, healthcare,
      education, personal, travel, insurance,
      gifts, bills, other-expense, 
    - If the input indicates income, set type to "INCOME".
    - Income Category must be one of:
      salary, investments, business-income,rental-income, pocket-money,gift, freelance, other-income
    - If the type cannot be determined, set it to null.

    Return ONLY valid JSON in this exact format:
    {
      "amount": number,
      "type": "INCOME" | "EXPENSE" | null,
      "date": "ISO date string",
      "description": "string",
      "merchantName": "string",
      "category": "string"
    }
      If a field cannot be extracted, use:
      - empty string for strings
      - 0 for amount
    `;

    const result = await model.generateContent([
        {
            text: input
        },
        prompt,
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    const data = JSON.parse(cleanedText);
    
    return next(
        res.status(200).json({
            status: "success",
            msg: "Natural Language processed successfully",
            data: {
                amount: parseFloat(data.amount),
                date: data.date ? new Date(data.date) : null,
                description: data.description,
                merchantName: data.merchantName,
                category: data.category,
                type: data.type,
            }
        })
    )
    }
    catch (error) {
      console.error("Error Extracting from natural Language:", error);
      return next(
        res.status(500).json({
          status: "error",
          msg: "Internal server error",
        })
      );
    }
    
};

export default naturalLanguageExtraction;
