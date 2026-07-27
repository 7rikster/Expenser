import { prisma } from "../../../lib/index.js";
import { startOfMonth, endOfMonth } from "src/utils/functions";

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

  const m1End = endOfMonth(m1Date);
  const m2End = endOfMonth(m2Date);

  // Fetch aggregates and category breakdowns in parallel
  const [m1Expense, m1Income, m2Expense, m2Income, m1Categories, m2Categories] =
    await Promise.all([
      prisma.monthlyExpense.findUnique({
        where: { userId_month: { userId, month: m1Date } },
      }),
      prisma.monthlyIncome.findUnique({
        where: { userId_month: { userId, month: m1Date } },
      }),
      prisma.monthlyExpense.findUnique({
        where: { userId_month: { userId, month: m2Date } },
      }),
      prisma.monthlyIncome.findUnique({
        where: { userId_month: { userId, month: m2Date } },
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: m1Date, lte: m1End },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: m2Date, lte: m2End },
        },
        _sum: { amount: true },
      }),
    ]);

  const m1TotalExpense = m1Expense ? m1Expense.total.toNumber() : 0;
  const m1TotalIncome = m1Income ? m1Income.total.toNumber() : 0;
  const m1NetSavings = m1TotalIncome - m1TotalExpense;
  const m1SavingsRate =
    m1TotalIncome === 0
      ? 0
      : Number(((m1NetSavings / m1TotalIncome) * 100).toFixed(1));

  const m2TotalExpense = m2Expense ? m2Expense.total.toNumber() : 0;
  const m2TotalIncome = m2Income ? m2Income.total.toNumber() : 0;
  const m2NetSavings = m2TotalIncome - m2TotalExpense;
  const m2SavingsRate =
    m2TotalIncome === 0
      ? 0
      : Number(((m2NetSavings / m2TotalIncome) * 100).toFixed(1));

  // Build category change deltas
  const m1CatMap = new Map(
    m1Categories.map((g) => [g.category, g._sum.amount?.toNumber() || 0])
  );
  const m2CatMap = new Map(
    m2Categories.map((g) => [g.category, g._sum.amount?.toNumber() || 0])
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
