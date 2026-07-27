import { prisma } from "../../lib";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { startOfMonth } from "src/utils/functions";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const SUB_CATEGORY_KEYWORDS = {
    food: {
        Swiggy: ["swiggy"],
        Zomato: ["zomato"],
        Restaurants: ["restaurant", "cafe", "dhaba", "diner", "bistro"],
    },
    transportation: {
        Uber: ["uber"],
        Ola: ["ola"],
        Rapido: ["rapido"],
        "Public Transport": ["metro", "bus", "train", "local"],
    },
    groceries: {
        Blinkit: ["blinkit"],
        Instamart: ["instamart"],
        BigBasket: ["bigbasket"],
        Zepto: ["zepto"],
    },
    shopping: {
        Amazon: ["amazon"],
        Flipkart: ["flipkart"],
        Myntra: ["myntra"],
        Malls: ["mall", "lifestyle", "westside", "shoppers"],
    },
    entertainment: {
        Netflix: ["netflix"],
        Spotify: ["spotify"],
        "Amazon Prime": ["prime video", "amazon prime"],
        "Disney+": ["disney", "hotstar"],
    },
};
const CATEGORIES_WITH_SUBS = new Set(Object.keys(SUB_CATEGORY_KEYWORDS));
function extractMerchant(description) {
    if (!description)
        return "Others";
    const parts = description.split(" - ");
    return parts[0].trim();
}
function matchSubCategory(category, merchant) {
    const keywords = SUB_CATEGORY_KEYWORDS[category];
    if (!keywords)
        return "Others";
    const lowerMerchant = merchant.toLowerCase();
    for (const [subName, patterns] of Object.entries(keywords)) {
        if (patterns.some((pattern) => lowerMerchant.includes(pattern))) {
            return subName;
        }
    }
    return "Others";
}
export async function generateAndStoreMonthlyReviewWithAI(userId, date) {
    const monthStart = startOfMonth(date);
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1, 0, 0, 0, 0) - 1);
    const transactions = await prisma.transaction.findMany({
        where: { userId, date: { gte: monthStart, lte: monthEnd } },
        select: {
            type: true,
            amount: true,
            category: true,
            description: true,
            isRecurring: true,
            recurringInterval: true,
        },
    });
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = new Map();
    const categorySubTotals = new Map();
    const recurringItems = [];
    for (const tx of transactions) {
        const amount = Number(tx.amount);
        if (tx.type === "INCOME") {
            totalIncome += amount;
        }
        else {
            totalExpense += amount;
            categoryTotals.set(tx.category, (categoryTotals.get(tx.category) || 0) + amount);
            if (CATEGORIES_WITH_SUBS.has(tx.category)) {
                if (!categorySubTotals.has(tx.category)) {
                    categorySubTotals.set(tx.category, new Map());
                }
                const merchant = extractMerchant(tx.description);
                const subName = matchSubCategory(tx.category, merchant);
                const subMap = categorySubTotals.get(tx.category);
                subMap.set(subName, (subMap.get(subName) || 0) + amount);
            }
            if (tx.isRecurring) {
                recurringItems.push({
                    description: tx.description || "Unknown",
                    amount,
                    category: tx.category,
                    interval: tx.recurringInterval,
                });
            }
        }
    }
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome === 0
        ? 0
        : Number(((netSavings / totalIncome) * 100).toFixed(2));
    const categoryBreakdown = Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => {
        const percentage = totalExpense === 0
            ? 0
            : Number(((amount / totalExpense) * 100).toFixed(1));
        const item = {
            category,
            amount,
            percentage,
        };
        if (CATEGORIES_WITH_SUBS.has(category) &&
            categorySubTotals.has(category)) {
            const subMap = categorySubTotals.get(category);
            item.subCategories = Array.from(subMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([name, amt]) => ({ name, amount: amt }));
        }
        return item;
    });
    const userBudget = await prisma.userBudget.findUnique({
        where: { userId_month: { userId, month: monthStart } },
        include: { categoryBudgets: true },
    });
    const budgetStatus = {
        totalBudget: userBudget ? Number(userBudget.amount) : 0,
        totalSpent: totalExpense,
        exceeded: userBudget ? totalExpense > Number(userBudget.amount) : false,
        difference: userBudget ? Number(userBudget.amount) - totalExpense : 0,
        categoryBudgets: userBudget
            ? userBudget.categoryBudgets.map((cb) => ({
                category: cb.category,
                budgeted: Number(cb.amount),
                spent: categoryTotals.get(cb.category) || 0,
                exceeded: (categoryTotals.get(cb.category) || 0) > Number(cb.amount),
            }))
            : [],
    };
    const uniqueRecurring = new Map();
    for (const item of recurringItems) {
        const key = `${item.description}:${item.category}`;
        if (!uniqueRecurring.has(key)) {
            uniqueRecurring.set(key, item);
        }
    }
    const recurringExpenses = Array.from(uniqueRecurring.values());
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });
    const monthName = monthStart.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });
    const prompt = `You are a personal finance analyst reviewing a user's monthly spending data for ${monthName}.

Data:
- Total Income: ₹${totalIncome}
- Total Expenses: ₹${totalExpense}
- Net Savings: ₹${netSavings} (Savings Rate: ${savingsRate}%)
- Top Categories: ${JSON.stringify(categoryBreakdown.slice(0, 5))}
- Recurring Expenses: ${JSON.stringify(recurringExpenses)}
- Budget Status: ${JSON.stringify(budgetStatus)}

Write a 3-5 sentence executive summary paragraph. Be specific with numbers. Highlight the biggest spending categories and any budget overruns. Comment on the savings rate. If there are concerning patterns (like high food delivery or ride-hailing), mention them. Keep the tone friendly but direct. Do not use bullet points or headers — just a cohesive paragraph.`;
    const aiResult = await model.generateContent(prompt);
    const summary = aiResult.response.text().trim();
    const reviewData = {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        categoryBreakdown: categoryBreakdown,
        recurringExpenses: recurringExpenses,
        budgetStatus: budgetStatus,
        summary,
    };
    return prisma.monthlyReview.upsert({
        where: { userId_month: { userId, month: monthStart } },
        update: reviewData,
        create: {
            userId,
            month: monthStart,
            ...reviewData,
        },
    });
}
