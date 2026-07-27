import { prisma } from "../../../lib/index.js";
import { startOfMonth } from "src/utils/functions";

function parseMonth(monthStr?: string): Date {
  if (!monthStr) return startOfMonth(new Date());
  const parts = monthStr.split("-");
  return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
}

export async function predictEndOfMonth({
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

  const isCurrentMonth =
    monthDate.getUTCFullYear() === now.getUTCFullYear() &&
    monthDate.getUTCMonth() === now.getUTCMonth();
  const daysElapsed = isCurrentMonth ? Math.max(1, now.getDate()) : totalDaysInMonth;
  const daysRemaining = totalDaysInMonth - daysElapsed;

  const [monthlyExpense, userBudget] = await Promise.all([
    prisma.monthlyExpense.findUnique({
      where: { userId_month: { userId, month: monthDate } },
    }),
    prisma.userBudget.findUnique({
      where: { userId_month: { userId, month: monthDate } },
    }),
  ]);

  const currentSpend = monthlyExpense ? monthlyExpense.total.toNumber() : 0;
  const dailyAverage = daysElapsed > 0 ? Number((currentSpend / daysElapsed).toFixed(0)) : 0;
  const projectedTotal = Number(((currentSpend / daysElapsed) * totalDaysInMonth).toFixed(0));
  const budgetAmount = userBudget ? userBudget.amount.toNumber() : null;
  const willExceedBudget = budgetAmount !== null ? projectedTotal > budgetAmount : null;
  const projectedSurplusOrDeficit =
    budgetAmount !== null ? budgetAmount - projectedTotal : null;

  return {
    month: monthDate.toISOString().slice(0, 7),
    currentSpend,
    dailyAverage,
    daysElapsed,
    daysRemaining,
    daysInMonth: totalDaysInMonth,
    projectedTotal,
    budgetAmount,
    willExceedBudget,
    projectedSurplusOrDeficit,
  };
}
