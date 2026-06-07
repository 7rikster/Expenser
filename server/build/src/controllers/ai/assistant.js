import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { prisma } from "../../lib";
import { startOfDay, startOfMonth, invalidateTransactionListCache, getWeekStart, toLocalDateString } from "src/utils/functions";
import { Prisma as P } from "../../../generated/prisma/client";
import redis from "src/lib/redis";
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
        const result = await model.generateContent(contents);
        const responseText = result.response.text();
        const data = JSON.parse(responseText);
        if (data.action === "LIST_DB") {
            const filters = data.dbQueryFilters || {};
            const limit = filters.limit || 5;
            const transactions = await prisma.transaction.findMany({
                where: {
                    userId: user.id,
                    ...(filters.category && { category: filters.category }),
                    ...(filters.type && { type: filters.type }),
                    ...(filters.merchantName && {
                        description: {
                            contains: filters.merchantName,
                            mode: "insensitive",
                        },
                    }),
                    ...(filters.startDate &&
                        filters.endDate && {
                        date: {
                            gte: new Date(filters.startDate),
                            lte: new Date(filters.endDate),
                        },
                    }),
                    ...(filters.startDate &&
                        !filters.endDate && { date: { gte: new Date(filters.startDate) } }),
                    ...(!filters.startDate &&
                        filters.endDate && { date: { lte: new Date(filters.endDate) } }),
                },
                orderBy: { date: "desc" },
                take: limit,
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    description: true,
                    date: true,
                    category: true,
                },
            });
            if (transactions.length === 0) {
                data.replyText =
                    "I couldn't find any logged transactions matching those filters.";
            }
            else {
                data.replyText = `Here are your last ${transactions.length} logged transaction(s):`;
                data.transactions = transactions;
            }
            return res.status(200).json({ status: "success", msg: "Fetched transactions successfully", data: {
                    action: "LIST_DB",
                    transactions: data.transactions || [],
                    replyText: data.replyText,
                } });
        }
        if (data.action === "CONFIRM_DELETE_DB") {
            const filters = data.dbQueryFilters || {};
            const limit = filters.limit || 1;
            const transactions = await prisma.transaction.findMany({
                where: {
                    userId: user.id,
                    ...(filters.category && { category: filters.category }),
                    ...(filters.type && { type: filters.type }),
                    ...(filters.merchantName && {
                        description: {
                            contains: filters.merchantName,
                            mode: "insensitive",
                        },
                    }),
                    ...(filters.startDate &&
                        filters.endDate && {
                        date: {
                            gte: new Date(filters.startDate),
                            lte: new Date(filters.endDate),
                        },
                    }),
                    ...(filters.startDate &&
                        !filters.endDate && { date: { gte: new Date(filters.startDate) } }),
                    ...(!filters.startDate &&
                        filters.endDate && { date: { lte: new Date(filters.endDate) } }),
                },
                orderBy: { date: "desc" },
                take: limit,
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    description: true,
                    date: true,
                    category: true,
                },
            });
            if (transactions.length === 0) {
                return res.status(200).json({
                    status: "success",
                    msg: "No match found",
                    data: { action: "GENERAL", replyText: "I couldn't find any transaction matching that description in your database." }
                });
            }
            return res.status(200).json({
                status: "success",
                msg: "Awaiting database deletion confirmation",
                data: {
                    action: "CONFIRM_DELETE_DB",
                    transactions: transactions,
                    replyText: `Your last ${transactions.length > 1 ? "transactions" : "transaction"} matching the description ${transactions.length > 1 ? "are" : "is"}: \nAre you sure you want to delete ${transactions.length > 1 ? "these transactions" : "this transaction"}?`,
                }
            });
        }
        if (data.action === "DELETE_DB") {
            const idsToDelete = dbTransactionIds || [];
            console.log("idsToDelete:", idsToDelete);
            console.log("Array.isArray:", Array.isArray(idsToDelete));
            console.log("length:", idsToDelete?.length);
            if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) {
                return res.status(200).json({
                    status: "success",
                    msg: "Deletion aborted",
                    data: { action: "GENERAL", replyText: "I couldn't verify which transaction to delete. Deletion aborted." }
                });
            }
            const transactions = await prisma.transaction.findMany({
                where: { id: { in: idsToDelete }, userId: user.id },
            });
            if (transactions.length === 0) {
                return next(res.status(404).json({ status: "error", msg: "No matching transactions found", data: { action: "GENERAL", replyText: "I couldn't find the transaction you wanted to delete. Deletion aborted." } }));
            }
            const dayMap = new Map();
            const monthMap = new Map();
            const incomeMonthMap = new Map();
            let balanceChange = new P.Decimal(0);
            for (const txn of transactions) {
                const amount = new P.Decimal(txn.amount.toString());
                if (txn.type === "INCOME") {
                    balanceChange = balanceChange.sub(amount);
                    const month = startOfMonth(txn.date);
                    const monthKey = month.toISOString();
                    if (!incomeMonthMap.has(monthKey)) {
                        incomeMonthMap.set(monthKey, { month, totalDecrement: new P.Decimal(0), categories: new Map() });
                    }
                    const monthEntry = incomeMonthMap.get(monthKey);
                    monthEntry.totalDecrement = monthEntry.totalDecrement.add(amount);
                    monthEntry.categories.set(txn.category, (monthEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount));
                }
                else if (txn.type === "EXPENSE") {
                    balanceChange = balanceChange.add(amount);
                    const day = startOfDay(txn.date);
                    const month = startOfMonth(txn.date);
                    const dayKey = day.toISOString();
                    const monthKey = month.toISOString();
                    if (!dayMap.has(dayKey)) {
                        dayMap.set(dayKey, { day, totalDecrement: new P.Decimal(0), categories: new Map() });
                    }
                    const dayEntry = dayMap.get(dayKey);
                    dayEntry.totalDecrement = dayEntry.totalDecrement.add(amount);
                    dayEntry.categories.set(txn.category, (dayEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount));
                    if (!monthMap.has(monthKey)) {
                        monthMap.set(monthKey, { month, totalDecrement: new P.Decimal(0), categories: new Map() });
                    }
                    const monthEntry = monthMap.get(monthKey);
                    monthEntry.totalDecrement = monthEntry.totalDecrement.add(amount);
                    monthEntry.categories.set(txn.category, (monthEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount));
                }
            }
            await prisma.$transaction(async (tx) => {
                await tx.transaction.deleteMany({ where: { id: { in: idsToDelete }, userId: user.id } });
                if (!balanceChange.isZero()) {
                    await tx.user.update({
                        where: { id: user.id },
                        data: { balance: { increment: balanceChange } },
                    });
                }
                if (dayMap.size > 0) {
                    const dayDates = [...dayMap.values()].map((d) => d.day);
                    const dailyExpenses = await tx.dailyExpense.findMany({
                        where: { userId: user.id, date: { in: dayDates } },
                        include: { expenseItems: true },
                    });
                    const dailyByDate = new Map(dailyExpenses.map((de) => [de.date.toISOString(), de]));
                    const dailyOps = [];
                    for (const [dayKey, { totalDecrement, categories }] of dayMap) {
                        const daily = dailyByDate.get(dayKey);
                        if (!daily)
                            continue;
                        const newTotal = daily.total.sub(totalDecrement);
                        if (newTotal.lte(0)) {
                            dailyOps.push(tx.dailyExpense.delete({ where: { id: daily.id } }));
                        }
                        else {
                            dailyOps.push(tx.dailyExpense.update({
                                where: { id: daily.id },
                                data: { total: { decrement: totalDecrement } },
                            }));
                            const itemsByCategory = new Map(daily.expenseItems.map((item) => [item.category, item]));
                            for (const [category, catDecrement] of categories) {
                                const item = itemsByCategory.get(category);
                                if (!item)
                                    continue;
                                const newItemTotal = item.amount.sub(catDecrement);
                                if (newItemTotal.lte(0)) {
                                    dailyOps.push(tx.dailyExpenseItem.delete({ where: { id: item.id } }));
                                }
                                else {
                                    dailyOps.push(tx.dailyExpenseItem.update({
                                        where: { id: item.id },
                                        data: { amount: { decrement: catDecrement } },
                                    }));
                                }
                            }
                        }
                    }
                    await Promise.all(dailyOps);
                }
                if (monthMap.size > 0) {
                    const monthDates = [...monthMap.values()].map((m) => m.month);
                    const monthlyExpenses = await tx.monthlyExpense.findMany({
                        where: { userId: user.id, month: { in: monthDates } },
                        include: { expenseItems: true },
                    });
                    const monthlyByMonth = new Map(monthlyExpenses.map((me) => [me.month.toISOString(), me]));
                    const monthlyOps = [];
                    for (const [monthKey, { totalDecrement, categories }] of monthMap) {
                        const monthly = monthlyByMonth.get(monthKey);
                        if (!monthly)
                            continue;
                        const newTotal = monthly.total.sub(totalDecrement);
                        if (newTotal.lte(0)) {
                            monthlyOps.push(tx.monthlyExpense.delete({ where: { id: monthly.id } }));
                        }
                        else {
                            monthlyOps.push(tx.monthlyExpense.update({
                                where: { id: monthly.id },
                                data: { total: { decrement: totalDecrement } },
                            }));
                            const itemsByCategory = new Map(monthly.expenseItems.map((item) => [item.category, item]));
                            for (const [category, catDecrement] of categories) {
                                const item = itemsByCategory.get(category);
                                if (!item)
                                    continue;
                                const newItemTotal = item.amount.sub(catDecrement);
                                if (newItemTotal.lte(0)) {
                                    monthlyOps.push(tx.monthlyExpenseItem.delete({ where: { id: item.id } }));
                                }
                                else {
                                    monthlyOps.push(tx.monthlyExpenseItem.update({
                                        where: { id: item.id },
                                        data: { amount: { decrement: catDecrement } },
                                    }));
                                }
                            }
                        }
                    }
                    await Promise.all(monthlyOps);
                }
                if (incomeMonthMap.size > 0) {
                    const monthDates = [...incomeMonthMap.values()].map((m) => m.month);
                    const monthlyIncomes = await tx.monthlyIncome.findMany({
                        where: { userId: user.id, month: { in: monthDates } },
                        include: { incomeItems: true },
                    });
                    const monthlyByMonth = new Map(monthlyIncomes.map((me) => [me.month.toISOString(), me]));
                    const monthlyOps = [];
                    for (const [monthKey, { totalDecrement, categories }] of incomeMonthMap) {
                        const monthly = monthlyByMonth.get(monthKey);
                        if (!monthly)
                            continue;
                        const newTotal = monthly.total.sub(totalDecrement);
                        if (newTotal.lte(0)) {
                            monthlyOps.push(tx.monthlyIncome.delete({ where: { id: monthly.id } }));
                        }
                        else {
                            monthlyOps.push(tx.monthlyIncome.update({
                                where: { id: monthly.id },
                                data: { total: { decrement: totalDecrement } },
                            }));
                            const itemsByCategory = new Map(monthly.incomeItems.map((item) => [item.category, item]));
                            for (const [category, catDecrement] of categories) {
                                const item = itemsByCategory.get(category);
                                if (!item)
                                    continue;
                                const newItemTotal = item.amount.sub(catDecrement);
                                if (newItemTotal.lte(0)) {
                                    monthlyOps.push(tx.monthlyIncomeItem.delete({ where: { id: item.id } }));
                                }
                                else {
                                    monthlyOps.push(tx.monthlyIncomeItem.update({
                                        where: { id: item.id },
                                        data: { amount: { decrement: catDecrement } },
                                    }));
                                }
                            }
                        }
                    }
                    await Promise.all(monthlyOps);
                }
            }, { timeout: 30000 });
            const todayKey = new Date().toISOString().slice(0, 10);
            const monthlyTrendCacheKey = `monthly-trend:${clerkUserId}:${new Date().toISOString().slice(0, 7)}`;
            await redis.del(`dashboard:${clerkUserId}:${todayKey}`);
            await redis.del(monthlyTrendCacheKey);
            let cursor = "0";
            const pattern = `weekly-spending:${clerkUserId}:*`;
            do {
                const result = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
                cursor = result[0];
                const keys = result[1];
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor !== "0");
            let cursor1 = "0";
            const pattern1 = `category-breakdown:${clerkUserId}:*`;
            do {
                const result = await redis.scan(cursor1, "MATCH", pattern1, "COUNT", 100);
                cursor1 = result[0];
                const keys = result[1];
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor1 !== "0");
            await invalidateTransactionListCache(redis, clerkUserId);
            data.replyText = `Successfully deleted the following transaction(s) from your database:\n${transactions.map((t) => `- ${t.description} | Rs. ${t.amount} | ${t.date.toISOString().slice(0, 10)}`).join("\n")}`;
            return res.status(200).json({ status: "success", msg: "Deleted", data: {
                    action: "GENERAL",
                    replyText: data.replyText,
                } });
        }
        if (data.action === "APPROVE_DRAFTS") {
            if (data.draftTransactions && data.draftTransactions.length > 0) {
                const createdTransactions = await prisma.$transaction(async (tx) => {
                    const records = [];
                    let balanceChange = new P.Decimal(0);
                    for (const item of data.draftTransactions) {
                        const { amount, category, description, merchantName, date, type } = item;
                        if (!amount || !category || !type || (type !== "EXPENSE" && type !== "INCOME")) {
                            throw new Error("Missing required transaction properties: amount, category, type");
                        }
                        const transAmount = new P.Decimal(amount);
                        const transDate = date ? new Date(date) : new Date();
                        const formattedDescription = merchantName && description
                            ? `${merchantName} - ${description}`
                            : merchantName || description || "AI Assistant Transaction";
                        const newTrans = await tx.transaction.create({
                            data: {
                                type,
                                amount: transAmount,
                                category,
                                description: formattedDescription,
                                date: transDate,
                                isRecurring: false,
                                userId: user.id,
                            },
                        });
                        records.push(newTrans);
                        if (type === "EXPENSE") {
                            balanceChange = balanceChange.sub(transAmount);
                            const day = startOfDay(transDate);
                            const month = startOfMonth(transDate);
                            const dailyExpense = await tx.dailyExpense.upsert({
                                where: {
                                    userId_date: {
                                        userId: user.id,
                                        date: day,
                                    },
                                },
                                update: {
                                    total: { increment: transAmount },
                                },
                                create: {
                                    userId: user.id,
                                    date: day,
                                    total: transAmount,
                                },
                            });
                            await tx.dailyExpenseItem.upsert({
                                where: {
                                    dailyId_category: {
                                        dailyId: dailyExpense.id,
                                        category,
                                    },
                                },
                                update: {
                                    amount: { increment: transAmount },
                                },
                                create: {
                                    dailyId: dailyExpense.id,
                                    category,
                                    amount: transAmount,
                                },
                            });
                            const monthlyExpense = await tx.monthlyExpense.upsert({
                                where: {
                                    userId_month: {
                                        userId: user.id,
                                        month,
                                    },
                                },
                                update: {
                                    total: { increment: transAmount },
                                },
                                create: {
                                    userId: user.id,
                                    month,
                                    total: transAmount,
                                },
                            });
                            await tx.monthlyExpenseItem.upsert({
                                where: {
                                    monthId_category: {
                                        monthId: monthlyExpense.id,
                                        category,
                                    },
                                },
                                update: {
                                    amount: { increment: transAmount },
                                },
                                create: {
                                    monthId: monthlyExpense.id,
                                    category,
                                    amount: transAmount,
                                },
                            });
                        }
                        else if (type === "INCOME") {
                            balanceChange = balanceChange.add(transAmount);
                            const month = startOfMonth(transDate);
                            const monthlyIncome = await tx.monthlyIncome.upsert({
                                where: {
                                    userId_month: {
                                        userId: user.id,
                                        month,
                                    },
                                },
                                update: {
                                    total: { increment: transAmount },
                                },
                                create: {
                                    userId: user.id,
                                    month,
                                    total: transAmount,
                                },
                            });
                            await tx.monthlyIncomeItem.upsert({
                                where: {
                                    monthId_category: {
                                        monthId: monthlyIncome.id,
                                        category,
                                    },
                                },
                                update: {
                                    amount: { increment: transAmount },
                                },
                                create: {
                                    monthId: monthlyIncome.id,
                                    category,
                                    amount: transAmount,
                                },
                            });
                        }
                    }
                    if (!balanceChange.isZero()) {
                        await tx.user.update({
                            where: { id: user.id },
                            data: {
                                balance: { increment: balanceChange },
                            },
                        });
                    }
                    return records;
                }, { timeout: 20000 });
                const uniqueDates = Array.from(new Set(data.draftTransactions.map((t) => new Date(t.date || Date.now()).toDateString()))).map((dStr) => new Date(dStr));
                const currentTodayKey = new Date().toISOString().slice(0, 10);
                await redis.del(`dashboard:${clerkUserId}:${currentTodayKey}`);
                for (const dateObj of uniqueDates) {
                    const todayKey = dateObj.toISOString().slice(0, 10);
                    const monthKey = dateObj.toISOString().slice(0, 7);
                    const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
                    const weekStart = toLocalDateString(getWeekStart(dateObj));
                    const dashboardCacheKey = `dashboard:${clerkUserId}:${todayKey}`;
                    const monthlyTrendCacheKey = `monthly-trend:${clerkUserId}:${monthKey}`;
                    const weeklyPatternCacheKey = `weekly-spending:${clerkUserId}:${weekStart}`;
                    const categoryBreakdownCacheKey = `category-breakdown:${clerkUserId}:${monthStart}`;
                    await redis.del(dashboardCacheKey);
                    await redis.del(monthlyTrendCacheKey);
                    await redis.del(weeklyPatternCacheKey);
                    await redis.del(categoryBreakdownCacheKey);
                }
                await invalidateTransactionListCache(redis, clerkUserId);
                data.replyText = `Successfully approved! I've logged the ${createdTransactions.length} ${createdTransactions.length === 1 ? "transaction" : "transactions"} to your database.`;
                data.draftTransactions = [];
                return res.status(200).json({ status: "success", msg: "Approved", data: {
                        action: "APPROVE_DRAFTS",
                        transactions: [],
                        replyText: data.replyText,
                    } });
            }
            else {
                return res.status(400).json({
                    status: "Failed",
                    msg: "No draft transactions to approve",
                    data: {
                        action: "GENERAL",
                        replyText: "I couldn't find any draft transactions to approve.",
                    }
                });
            }
        }
        return res.status(200).json({
            status: "success",
            msg: "Parsed successfully",
            data: {
                action: data.action,
                transactions: data.draftTransactions || [],
                dbQueryFilters: data.dbQueryFilters || {},
                replyText: data.replyText,
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
