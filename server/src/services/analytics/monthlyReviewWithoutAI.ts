import { prisma } from "../../lib";
import { Prisma } from "../../../generated/prisma/client";
import { startOfMonth } from "src/utils/functions";

// ──────────────────────────────────────────────────────────
// Sub-category keyword map
// Only these categories get sub-category breakdowns.
// Keys are matched case-insensitively against the merchant
// name (first segment of description before " - ").
// ──────────────────────────────────────────────────────────
const SUB_CATEGORY_KEYWORDS: Record<string, Record<string, string[]>> = {
  food: {
    Swiggy: ["swiggy"],
    Zomato: ["zomato"],
    Restaurants: ["restaurant", "cafe", "dhaba", "diner", "bistro"],
    // Everything else falls into "Others"
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

// Categories that should have sub-categories
const CATEGORIES_WITH_SUBS = new Set(Object.keys(SUB_CATEGORY_KEYWORDS));

// ──────────────────────────────────────────────────────────
// Helper: extract merchant name from description
// Description format: "MerchantName - Details"
// ──────────────────────────────────────────────────────────
function extractMerchant(description: string | null): string {
  if (!description) return "Others";
  const parts = description.split(" - ");
  return parts[0].trim();
}

// ──────────────────────────────────────────────────────────
// Helper: match a merchant to a sub-category name
// ──────────────────────────────────────────────────────────
function matchSubCategory(category: string, merchant: string): string {
  const keywords = SUB_CATEGORY_KEYWORDS[category];
  if (!keywords) return "Others";

  const lowerMerchant = merchant.toLowerCase();

  for (const [subName, patterns] of Object.entries(keywords)) {
    if (patterns.some((pattern) => lowerMerchant.includes(pattern))) {
      return subName;
    }
  }
  return "Others";
}

// ──────────────────────────────────────────────────────────
// Types for the JSON fields
// ──────────────────────────────────────────────────────────
interface SubCategoryItem {
  name: string;
  amount: number;
}

interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  subCategories?: SubCategoryItem[];
}

// ──────────────────────────────────────────────────────────
// Main: generate and store a monthly review
// ──────────────────────────────────────────────────────────
export async function generateAndStoreMonthlyReviewWithoutAI(
  userId: string,
  date: Date
) {
  const monthStart = startOfMonth(date);
  const monthEnd = new Date(
    Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth() + 1,
      1,
      0,
      0,
      0,
      0
    ) - 1
  );

  // ── 1. Fetch all transactions for the month ──
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

  // ── 2. Calculate core metrics ──
  let totalIncome = 0;
  let totalExpense = 0;

  // Category -> total amount
  const categoryTotals = new Map<string, number>();
  // Category -> subCategory -> amount
  const categorySubTotals = new Map<string, Map<string, number>>();

  // Recurring expenses
  const recurringItems: {
    description: string;
    amount: number;
    category: string;
    interval: string | null;
  }[] = [];

  for (const tx of transactions) {
    const amount = Number(tx.amount);

    if (tx.type === "INCOME") {
      totalIncome += amount;
    } else {
      totalExpense += amount;

      // Category totals
      categoryTotals.set(
        tx.category,
        (categoryTotals.get(tx.category) || 0) + amount
      );

      // Sub-category breakdown (only for applicable categories)
      if (CATEGORIES_WITH_SUBS.has(tx.category)) {
        if (!categorySubTotals.has(tx.category)) {
          categorySubTotals.set(tx.category, new Map());
        }
        const merchant = extractMerchant(tx.description);
        const subName = matchSubCategory(tx.category, merchant);
        const subMap = categorySubTotals.get(tx.category)!;
        subMap.set(subName, (subMap.get(subName) || 0) + amount);
      }

      // Collect recurring
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
  const savingsRate =
    totalIncome === 0
      ? 0
      : Number(((netSavings / totalIncome) * 100).toFixed(2));

  // ── 3. Build categoryBreakdown with sub-categories ──
  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(
    categoryTotals.entries()
  )
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => {
      const percentage =
        totalExpense === 0
          ? 0
          : Number(((amount / totalExpense) * 100).toFixed(1));

      const item: CategoryBreakdownItem = {
        category,
        amount,
        percentage,
      };

      // Attach sub-categories if applicable
      if (
        CATEGORIES_WITH_SUBS.has(category) &&
        categorySubTotals.has(category)
      ) {
        const subMap = categorySubTotals.get(category)!;
        item.subCategories = Array.from(subMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, amt]) => ({ name, amount: amt }));
      }

      return item;
    });

  // ── 4. Build budgetStatus ──
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

  // ── 5. Deduplicate recurring expenses ──
  const uniqueRecurring = new Map<string, (typeof recurringItems)[0]>();
  for (const item of recurringItems) {
    const key = `${item.description}:${item.category}`;
    if (!uniqueRecurring.has(key)) {
      uniqueRecurring.set(key, item);
    }
  }
  const recurringExpenses = Array.from(uniqueRecurring.values());

  const budgetUsedPercent =
    budgetStatus.totalBudget > 0
      ? (budgetStatus.totalSpent / budgetStatus.totalBudget) * 100
      : 0;

  const summary = `So far this month, you've earned ₹${totalIncome.toFixed(0)} and spent ₹${totalExpense.toFixed(0)}.
   Your current savings stand at ₹${netSavings.toFixed(0)} (${savingsRate.toFixed(1)}% savings rate). 
   You've used ${budgetUsedPercent.toFixed(0)}% of your monthly budget so far.`;

  const reviewData = {
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    categoryBreakdown: categoryBreakdown as unknown as Prisma.InputJsonValue,
    recurringExpenses: recurringExpenses as unknown as Prisma.InputJsonValue,
    budgetStatus: budgetStatus as unknown as Prisma.InputJsonValue,
    summary,
  };

  // ── 7. Upsert into database ──
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
