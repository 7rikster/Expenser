import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/index.js";

// Initialize Gemini client with the API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2!);

const assistant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    /* 1️⃣ Auth validation */
    const { userId: clerkUserId } = req.auth();

    if (!clerkUserId) {
      return next(
        res.status(401).json({
          status: "error",
          msg: "Unauthorized",
        })
      );
    }

    /* 3️⃣ Check Inputs */
    const file = req.file; // Multer uploads to memory buffer
    const { message } = req.body;

    if (!file && !message) {
      return res.status(400).json({
        status: "error",
        msg: "Please provide either a text prompt or an image.",
      });
    }

    // Set local date for relative date resolution (e.g. today, yesterday)
    const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

    // 4️⃣ Define Structured Output Schema for Gemini SDK (uppercase string syntax)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            transactions: {
              type: SchemaType.ARRAY,
              description: "List of transactions extracted from the receipt, screenshot, or text prompt",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  amount: { 
                    type: SchemaType.NUMBER, 
                    description: "Numeric transaction amount. Do not include currency symbols" 
                  },
                  date: { 
                    type: SchemaType.STRING, 
                    description: "ISO 8601 formatted date (YYYY-MM-DD)" 
                  },
                  description: { 
                    type: SchemaType.STRING, 
                    description: "Details of what was bought or transfer purpose (e.g., Dinner, Uber Ride, Freelance payout)" 
                  },
                  merchantName: { 
                    type: SchemaType.STRING, 
                    description: "Vendor name, store name, or name of sender/receiver (e.g. Target, Subway, John Doe)" 
                  },
                  category: {
                    type: SchemaType.STRING,
                    format: "enum",
                    description: "Select the most accurate category.",
                    enum: [
                      "housing", "transportation", "groceries", "utilities",
                      "entertainment", "food", "shopping", "healthcare",
                      "education", "personal", "travel", "insurance",
                      "gifts", "bills", "other-expense","salary", "freelance", "investments", "business-income","rental-income", "other-income"
                    ] 
                  },
                  type: {
                    type: SchemaType.STRING,
                    format: "enum",
                    description: "The transaction type. EXPENSE if the user paid money out. INCOME if the user received money.",
                    enum: ["INCOME", "EXPENSE"]
                  }
                },
                required: ["amount", "date", "description", "merchantName", "category", "type"]
              }
            }
          },
          required: ["transactions"]
        }
      }
    });

    // 5️⃣ Construct Multimodal Prompt
    const prompt = `
      Current local date: ${localDate}

      Analyze the provided screenshot, receipt image, and/or text message to extract a list of all transactions.
      
      Extraction Guidelines:
      - Locate ALL separate transactions. If a screenshot contains multiple UPI transfers, list each individually.
      - Resolve relative dates like 'today', 'yesterday', 'last night', 'this morning' using the provided Current local date.
      - Determine type:
        - EXPENSE: Funds sent, paid, debited, or items purchased. UPI keywords like "Paid to", "Transfer successful", "Sent to", "Debited".
        - INCOME: Funds received, salary, cashbacks, refunds. UPI keywords like "Received from", "Credited to your account", "+ ₹".
      - Map category strictly to one of the enum values listed in the schema.
      - If no date can be found, default to "${localDate}".
      - If no merchant name is available, use a descriptive general name.
      - Return the result matching the requested JSON structure.
    `;

    const contents: any[] = [prompt];

    // If text message is provided, append it to Gemini contents
    if (message) {
      contents.push(`User Message/Instructions: "${message}"`);
    }

    // If image file is provided, append its base64 data
    if (file) {
      contents.push({
        inlineData: {
          data: file.buffer.toString("base64"),
          mimeType: file.mimetype
        }
      });
    }

    // 6️⃣ Execute Gemini Call
    const result = await model.generateContent(contents);
    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    return res.status(200).json({
      status: "success",
      msg: "Parsed successfully",
      data: {
        transactions: data.transactions || []
      }
    });

  } catch (error) {
    console.error("AI Assistant Controller Error:", error);
    return next(
      res.status(500).json({
        status: "error",
        msg: "Internal server error during AI processing",
      })
    );
  }
};

export default assistant;