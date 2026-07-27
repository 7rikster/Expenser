import { startOfMonth } from "src/utils/functions";
import { getOrGenerateMonthlyReview } from "./helper.js";

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

  const review = await getOrGenerateMonthlyReview(userId, monthDate);

  const totalExpense = Number(review.totalExpense) || 0;
  const totalIncome = Number(review.totalIncome) || 0;
  const netSavings = Number(review.netSavings) || 0;
  const savingsRate = Number(review.savingsRate) || 0;
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
