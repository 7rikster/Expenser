import { prisma } from "../../../lib/index.js";
import { startOfMonth } from "src/utils/functions";

function parseMonth(monthStr?: string): Date {
  if (!monthStr) return startOfMonth(new Date());
  const parts = monthStr.split("-");
  return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
}

export async function getBudgetStatus({
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
  const currentDay = isCurrentMonth ? now.getDate() : totalDaysInMonth;
  const daysRatio = Number((currentDay / totalDaysInMonth).toFixed(2));

  const [userBudget, monthlyExpense] = await Promise.all([
    prisma.userBudget.findUnique({
      where: { userId_month: { userId, month: monthDate } },
      include: { categoryBudgets: true },
    }),
    prisma.monthlyExpense.findUnique({
      where: { userId_month: { userId, month: monthDate } },
      include: { expenseItems: true },
    }),
  ]);

  if (!userBudget) {
    return {
      noBudgetSet: true,
      month: monthDate.toISOString().slice(0, 7),
      message:
        "No budget has been set for this month. Set a budget to get spending insights.",
    };
  }

  const totalBudget = userBudget.amount.toNumber();
  const totalSpent = monthlyExpense ? monthlyExpense.total.toNumber() : 0;
  const remaining = totalBudget - totalSpent;
  const exceeded = totalSpent > totalBudget;
  const percentUsed =
    totalBudget === 0 ? 0 : Number(((totalSpent / totalBudget) * 100).toFixed(1));

  // Build per-category breakdown
  const expenseItemMap = new Map(
    (monthlyExpense?.expenseItems || []).map((item) => [
      item.category,
      item.amount.toNumber(),
    ])
  );

  const categoryBudgets = userBudget.categoryBudgets.map((cb) => {
    const budgeted = cb.amount.toNumber();
    const spent = expenseItemMap.get(cb.category) || 0;
    return {
      category: cb.category,
      budgeted,
      spent,
      remaining: budgeted - spent,
      exceeded: spent > budgeted,
      percentUsed:
        budgeted === 0 ? 0 : Number(((spent / budgeted) * 100).toFixed(1)),
    };
  });

  return {
    month: monthDate.toISOString().slice(0, 7),
    totalBudget,
    totalSpent,
    remaining,
    exceeded,
    percentUsed,
    daysRatio,
    budgetPercentShouldBe: Number((daysRatio * 100).toFixed(1)),
    categoryBudgets,
  };
}
