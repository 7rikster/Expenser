import { startOfMonth } from "src/utils/functions";
import { getOrGenerateMonthlyReview } from "./helper.js";

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

  const review = await getOrGenerateMonthlyReview(userId, monthDate);
  const status = review.budgetStatus as any;

  if (!status || !status.totalBudget || status.totalBudget === 0) {
    return {
      noBudgetSet: true,
      month: monthDate.toISOString().slice(0, 7),
      message:
        "No budget has been set for this month. Set a budget to get spending insights.",
    };
  }

  const totalBudget = Number(status.totalBudget);
  const totalSpent = Number(status.totalSpent) || 0;
  const remaining = Number(status.difference) || 0;
  const exceeded = !!status.exceeded;
  const percentUsed =
    totalBudget === 0 ? 0 : Number(((totalSpent / totalBudget) * 100).toFixed(1));

  const categoryBudgets = (status.categoryBudgets as any[] || []).map((cb) => {
    const budgeted = Number(cb.budgeted) || 0;
    const spent = Number(cb.spent) || 0;
    return {
      category: cb.category,
      budgeted,
      spent,
      remaining: budgeted - spent,
      exceeded: !!cb.exceeded,
      percentUsed: budgeted === 0 ? 0 : Number(((spent / budgeted) * 100).toFixed(1)),
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
