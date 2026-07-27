import { prisma } from "../../../lib/index.js";
import { startOfMonth } from "src/utils/functions";

function parseMonth(monthStr?: string): Date {
  if (!monthStr) return startOfMonth(new Date());
  // Handle "2026-07" or "2026-07-01" formats
  const parts = monthStr.split("-");
  return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
}

export async function getSpendingSummary({
  userId,
  args,
}: {
  userId: string;
  args: { month?: string };
}) {
  const monthDate = parseMonth(args.month);
  const now = new Date();
  const totalDaysInMonth = new Date(
    monthDate.getUTCFullYear(),
    monthDate.getUTCMonth() + 1,
    0
  ).getDate();
 
  // Days elapsed: if current month, use today's date; otherwise full month
  const isCurrentMonth =
    monthDate.getUTCFullYear() === now.getUTCFullYear() &&
    monthDate.getUTCMonth() === now.getUTCMonth();
  const daysElapsed = isCurrentMonth ? now.getDate() : totalDaysInMonth;

  const [monthlyExpense, monthlyIncome] = await Promise.all([
    prisma.monthlyExpense.findUnique({
      where: { userId_month: { userId, month: monthDate } },
    }),
    prisma.monthlyIncome.findUnique({
      where: { userId_month: { userId, month: monthDate } },
    }),
  ]);

  const totalExpense = monthlyExpense ? monthlyExpense.total.toNumber() : 0;
  const totalIncome = monthlyIncome ? monthlyIncome.total.toNumber() : 0;
  const netSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome === 0 ? 0 : Number(((netSavings / totalIncome) * 100).toFixed(1));
  const dailyAverage = daysElapsed > 0 ? Number((totalExpense / daysElapsed).toFixed(0)) : 0;

  return {
    month: monthDate.toISOString().slice(0, 7),
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    dailyAverage,
    daysElapsed,
    daysInMonth: totalDaysInMonth,
  };
}
