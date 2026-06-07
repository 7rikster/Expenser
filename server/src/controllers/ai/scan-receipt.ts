import { GoogleGenerativeAI } from "@google/generative-ai";
import { Request, Response, NextFunction } from "express";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)



const scanReceipt = async (
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
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: "error",
        msg: "No file uploaded",
      });
    }

    const base64Image = file.buffer.toString("base64");

    const prompt = `
    Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
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
      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string",
        "type": "INCOME" | "EXPENSE" | null
      }

      If its not a recipt, return an empty object
    `;

    const result = await model.generateContent([
        {
            inlineData: {
                data: base64Image,
                mimeType: file.mimetype
            }
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
            msg: "Receipt scanned successfully",
            data: {
                amount: parseFloat(data.amount),
                date: new Date(data.date),
                description: data.description,
                merchantName: data.merchantName,
                category: data.category,
                type: data.type,
            }
        })
    )
    }
    catch (error) {
      console.error("Error scanning receipt:", error);
      return next(
        res.status(500).json({
          status: "error",
          msg: "Internal server error",
        })
      );
    }
    
};

export default scanReceipt;
