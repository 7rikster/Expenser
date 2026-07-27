import { startOfMonth } from "src/utils/functions";
import { getOrGenerateMonthlyReview } from "./helper.js";

function parseMonth(monthStr?: string): Date {
  if (!monthStr) return startOfMonth(new Date());
  const parts = monthStr.split("-");
  return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
}

export async function compareMonths({
  userId,
  args,
}: {
  userId: string;
  args: { month1?: string; month2?: string };
}) {
  const now = new Date();
  const m1Date = args.month1
    ? parseMonth(args.month1)
    : startOfMonth(now);
  const m2Date = args.month2
    ? parseMonth(args.month2)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  // Fetch MonthlyReview records in parallel (includes cached or force-regenerated reviews)
  const [m1Review, m2Review] = await Promise.all([
    getOrGenerateMonthlyReview(userId, m1Date),
    getOrGenerateMonthlyReview(userId, m2Date),
  ]);

  const m1TotalExpense = Number(m1Review.totalExpense);
  const m1TotalIncome = Number(m1Review.totalIncome);
  const m1NetSavings = Number(m1Review.netSavings);
  const m1SavingsRate = Number(m1Review.savingsRate);

  const m2TotalExpense = Number(m2Review.totalExpense);
  const m2TotalIncome = Number(m2Review.totalIncome);
  const m2NetSavings = Number(m2Review.netSavings);
  const m2SavingsRate = Number(m2Review.savingsRate);

  const m1CatBreakdown = (m1Review.categoryBreakdown as any[]) || [];
  const m2CatBreakdown = (m2Review.categoryBreakdown as any[]) || [];

  // Build category change deltas
  const m1CatMap = new Map(
    m1CatBreakdown.map((c) => [c.category, Number(c.amount) || 0])
  );
  const m2CatMap = new Map(
    m2CatBreakdown.map((c) => [c.category, Number(c.amount) || 0])
  );

  const allCategories = new Set([...m1CatMap.keys(), ...m2CatMap.keys()]);
  const categoryChanges: {
    category: string;
    month1Amount: number;
    month2Amount: number;
    diff: number;
    percentChange: number;
  }[] = [];

  for (const cat of allCategories) {
    const a1 = m1CatMap.get(cat) || 0;
    const a2 = m2CatMap.get(cat) || 0;
    const diff = a1 - a2;
    const percentChange =
      a2 === 0 ? (a1 > 0 ? 100 : 0) : Number(((diff / a2) * 100).toFixed(1));
    categoryChanges.push({
      category: cat,
      month1Amount: a1,
      month2Amount: a2,
      diff,
      percentChange,
    });
  }

  // Sort by absolute diff descending
  categoryChanges.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return {
    month1: {
      month: m1Date.toISOString().slice(0, 7),
      totalIncome: m1TotalIncome,
      totalExpense: m1TotalExpense,
      netSavings: m1NetSavings,
      savingsRate: m1SavingsRate,
    },
    month2: {
      month: m2Date.toISOString().slice(0, 7),
      totalIncome: m2TotalIncome,
      totalExpense: m2TotalExpense,
      netSavings: m2NetSavings,
      savingsRate: m2SavingsRate,
    },
    deltas: {
      incomeDiff: m1TotalIncome - m2TotalIncome,
      expenseDiff: m1TotalExpense - m2TotalExpense,
      savingsRateDiff: Number((m1SavingsRate - m2SavingsRate).toFixed(1)),
      categoryChanges,
    },
  };
}
