import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { prisma } from "../../lib";
import { executeAction } from "src/services/assistant/actionRegistry";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2);
const assistant = async (req, res, next) => {
    try {
        const { userId: clerkUserId } = req.auth();
        if (!clerkUserId) {
            return next(res.status(401).json({
                status: "error",
                msg: "Unauthorized",
            }));
        }
        const user = await prisma.user.findUnique({ where: { clerkUserId }, select: { id: true } });
        if (!user) {
            return res.status(404).json({ status: "error", msg: "User not found" });
        }
        const file = req.file;
        const { message, pendingTransactions, lastAssistantMessage, dbTransactionIds: dbTransactionIdsRaw, } = req.body;
        const parsedPending = pendingTransactions
            ? JSON.parse(pendingTransactions)
            : [];
        const dbTransactionIds = dbTransactionIdsRaw ? JSON.parse(dbTransactionIdsRaw) : null;
        if (!file && !message) {
            return res.status(400).json({
                status: "error",
                msg: "Please provide either a text prompt or an image.",
            });
        }
        const localDate = new Date().toLocaleDateString("en-CA");
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        action: {
                            type: SchemaType.STRING,
                            format: "enum",
                            description: "The operation targeted by the user query.",
                            enum: [
                                "CREATE_DRAFT",
                                "UPDATE_DRAFT",
                                "DELETE_DRAFT",
                                "APPROVE_DRAFTS",
                                "LIST_DB",
                                "CONFIRM_DELETE_DB",
                                "DELETE_DB",
                                "GENERAL",
                            ],
                        },
                        draftTransactions: {
                            type: SchemaType.ARRAY,
                            description: "List of transactions extracted from the receipt, screenshot, or text prompt. Keep the 'id' field stable for existing draft items.",
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    id: {
                                        type: SchemaType.STRING,
                                        description: "Keep the original ID for modifications, generate a new UUID for additions.",
                                    },
                                    amount: {
                                        type: SchemaType.NUMBER,
                                        description: "Numeric transaction amount. Do not include currency symbols",
                                    },
                                    date: {
                                        type: SchemaType.STRING,
                                        description: "ISO 8601 formatted date (YYYY-MM-DD)",
                                    },
                                    description: {
                                        type: SchemaType.STRING,
                                        description: "Details of what was bought or transfer purpose (e.g., Dinner, Uber Ride, Freelance payout)",
                                    },
                                    merchantName: {
                                        type: SchemaType.STRING,
                                        description: "Vendor name, store name, or name of sender/receiver (e.g. Target, Subway, John Doe)",
                                    },
                                    category: {
                                        type: SchemaType.STRING,
                                        format: "enum",
                                        description: "Select the most accurate category.",
                                        enum: [
                                            "housing",
                                            "transportation",
                                            "groceries",
                                            "utilities",
                                            "entertainment",
                                            "food",
                                            "shopping",
                                            "healthcare",
                                            "education",
                                            "personal",
                                            "travel",
                                            "insurance",
                                            "gifts",
                                            "bills",
                                            "other-expense",
                                            "salary",
                                            "freelance",
                                            "investments",
                                            "business-income",
                                            "rental-income",
                                            "other-income",
                                        ],
                                    },
                                    type: {
                                        type: SchemaType.STRING,
                                        format: "enum",
                                        description: "The transaction type. EXPENSE if the user paid money out. INCOME if the user received money.",
                                        enum: ["INCOME", "EXPENSE"],
                                    },
                                },
                                required: [
                                    "id",
                                    "amount",
                                    "date",
                                    "description",
                                    "merchantName",
                                    "category",
                                    "type",
                                ],
                            },
                        },
                        dbQueryFilters: {
                            type: SchemaType.OBJECT,
                            description: "Query filters used if action is LIST_DB or CONFIRM_DELETE_DB.",
                            properties: {
                                limit: { type: SchemaType.NUMBER },
                                category: { type: SchemaType.STRING },
                                type: {
                                    type: SchemaType.STRING,
                                    format: "enum",
                                    enum: ["INCOME", "EXPENSE"],
                                },
                                merchantName: { type: SchemaType.STRING },
                                startDate: { type: SchemaType.STRING },
                                endDate: { type: SchemaType.STRING },
                            },
                        },
                        replyText: {
                            type: SchemaType.STRING,
                            description: "The textual reply to show to the user.",
                        },
                    },
                    required: ["action", "replyText"],
                },
            },
        });
        const systemPrompt = `
      Current local date: ${localDate}
      You are a smart conversational assistant that processes expenses. You manage two states:
      1. Pending Drafts: Local temporary draft items awaiting approval. Present Drafts: ${JSON.stringify(parsedPending)}.
      2. Database: Verified, persistent logs stored in the SQL database.
      
      State Disambiguation Rules:
      - If the user asks to "delete" or "change/update" something (e.g. "delete Uber", "change Swiggy category"):
        1. Look at the Pending Drafts first. If a match is found in the Draft list, run 'DELETE_DRAFT' or 'UPDATE_DRAFT'. Do NOT query the database.
        2. If the draft list is empty, OR no match exists, OR the user explicitly refers to logged/past data (e.g. "delete my last expense from DB"), set action to 'CONFIRM_DELETE_DB'.
      
      The last assistant message was: "${lastAssistantMessage || "N/A"}". Use this to understand the current context and maintain conversation continuity, especially for multi-turn interactions.

      Action Scenarios:
      
      A. APPROVE_DRAFTS:
         - Triggered by: "yes", "add them", "confirm", "approve", "looks good", "yep".
         - Set draftTransactions to the unmodified Present Drafts. Set replyText to: "I am adding the draft transaction(s) to your database."
         
      B. DELETE_DRAFT:
         - User wants to discard a draft item. Return the draftTransactions array with the matched item removed.
         - Reply: "I've removed the [merchantName] transaction from review."
         
      C. UPDATE_DRAFT:
         - User asks to modify a draft item (e.g. "set swiggy category to food", "change Amazon to 500"). Return the updated draft list maintaining the item's 'id'.
         - Reply: "I've updated the [field] of the [merchantName] draft transaction."
         
      D. CONFIRM_DELETE_DB:
         - User wants to delete a past database transaction (e.g. "delete my last expense", "delete swiggy from database").
         - Identify query parameters in 'dbQueryFilters' (e.g. limit: 1, type: "EXPENSE").
         
      E. DELETE_DB:
         - Triggered if 'dbTransactionIds' is provided in the request body (value: "${dbTransactionIds || ""}") and the user confirms they want to proceed.
         
      F. LIST_DB:
         - User wants to see past records (e.g. "Show me my last 5 utilities expenses").
         - Identify filters in 'dbQueryFilters'. Set replyText to: "Fetching transactions..."
         
      G. CREATE_DRAFT:
         - Extract transaction details from the prompt or image.
         - Generate a random uuid v4 for the 'id' of new items.
         - If category is uncertain, write "other-expense".
         - Conversational Rules:
           - If 1 item is mapped to "other-expense": "I found the amount [amount], but I could not determine the category. How would you like to categorize this?"
           - If multiple items are "other-expense":
             "[Count] transactions need categorization:
             - [merchant] [amount]
             - [merchant] [amount]
             Please categorize them before I add the expenses."
           - If all items are categorized: "I extracted [Count] transaction(s). Please verify the details below:"

      H. GENERAL:
         - For general queries or if the intent is unclear, set action to "GENERAL" and provide a helpful reply in 'replyText'.

      Merchant Category Reference:
      I am providing you a merchant category map for reference which contains some of the merchants and their corresponding categories. Use this as a reference for categorization but do not limit yourself to just these entries. Use the transaction description and your understanding to categorize transactions from merchants not listed here.:
        Merchant Name: Category        
      - swiggy: "food",
      - zomato: "food",
      - uber: "transportation",
      - ola: "transportation",
      - rapido: "transportation",
      - blinkit: "groceries",
      - instamart: "groceries",
      - netflix: "entertainment",
      - amazon prime: "entertainment",
      - amazon: "shopping",
      - flipkart: "shopping",
      - walmart: "shopping",

    `;
        const contents = [systemPrompt];
        if (message) {
            contents.push(`User Message/Instructions: "${message}"`);
        }
        if (file) {
            contents.push({
                inlineData: {
                    data: file.buffer.toString("base64"),
                    mimeType: file.mimetype,
                },
            });
        }
        const result1 = await model.generateContent(contents);
        const responseText = result1.response.text();
        const data = JSON.parse(responseText);
        const result = await executeAction(data.action, {
            userId: user.id,
            clerkUserId,
            data,
            dbTransactionIds
        });
        return res.status(200).json({
            status: result.status || "success",
            msg: result.msg || "Parsed successfully",
            data: {
                action: result.action,
                transactions: result.transactions || [],
                dbQueryFilters: data.dbQueryFilters || {},
                replyText: result.replyText,
            }
        });
    }
    catch (error) {
        console.error("AI Assistant Controller Error:", error);
        return next(res.status(500).json({
            status: "error",
            msg: "Internal server error during AI processing",
        }));
    }
};
export default assistant;
