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


    const prompt = `
    Analyze this input text and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )
      
      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      Example:
        Input: "Lunch at Cafe for Rs 250"
        Output:
        {
          "amount": 250,
          "date": "",
          "description": "Lunch at Cafe",
          "merchantName": "",
          "category": "food"
        }

      If the required information cannot be extracted from the input text, return an empty object
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
