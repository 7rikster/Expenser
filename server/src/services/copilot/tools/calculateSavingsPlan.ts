import { prisma } from "../../../lib/index.js";


// Discretionary categories where spending can typically be reduced
const DISCRETIONARY_CATEGORIES = [
  "food",
  "entertainment",
  "shopping",
  "personal",
  "travel",
  "gifts",
];

export async function calculateSavingsPlan({
  userId,
  args,
}: {
  userId: string;
  args: { targetAmount: number; targetMonths?: number; [key: string]: any };
}) {
  const now = new Date();
  const { targetAmount, targetMonths } = args;

  // Get last 3 months of data for averaging
  const months: Date[] = [];
  for (let i = 1; i <= 3; i++) {
    months.push(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    );
  }

  const [expenses, incomes, categoryGroups] = await Promise.all([
    prisma.monthlyExpense.findMany({
      where: { userId, month: { in: months } },
    }),
    prisma.monthlyIncome.findMany({
      where: { userId, month: { in: months } },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: months[months.length - 1], lte: new Date() },
      },
      _sum: { amount: true },
    }),
  ]);

  const monthCount = Math.max(expenses.length, 1);
  const totalExpense = expenses.reduce(
    (sum, e) => sum + e.total.toNumber(),
    0
  );
  const totalIncome = incomes.reduce(
    (sum, i) => sum + i.total.toNumber(),
    0
  );

  const avgMonthlyExpense = Number((totalExpense / monthCount).toFixed(0));
  const avgMonthlyIncome = Number(
    (totalIncome / Math.max(incomes.length, 1)).toFixed(0)
  );
  const currentMonthlySavings = avgMonthlyIncome - avgMonthlyExpense;

  // Calculate how long it would take at current rate
  const monthsToGoal =
    currentMonthlySavings > 0
      ? Math.ceil(targetAmount / currentMonthlySavings)
      : null;

  // Calculate required monthly savings if target months is given
  const requiredMonthlySavings = targetMonths
    ? Number((targetAmount / targetMonths).toFixed(0))
    : null;

  const feasible =
    requiredMonthlySavings !== null
      ? requiredMonthlySavings <= avgMonthlyIncome
      : currentMonthlySavings > 0;

  // Suggest cuts from discretionary categories
  const avgCategoryMap = new Map<string, number>();
  for (const g of categoryGroups) {
    const avg = (g._sum.amount?.toNumber() || 0) / monthCount;
    avgCategoryMap.set(g.category, Number(avg.toFixed(0)));
  }

  const suggestedCuts: {
    category: string;
    currentSpend: number;
    suggestedSpend: number;
    potentialSaving: number;
  }[] = [];

  const additionalSavingsNeeded = requiredMonthlySavings
    ? Math.max(0, requiredMonthlySavings - currentMonthlySavings)
    : 0;
  let cumulativeSaving = 0;

  // Sort discretionary categories by spend descending
  const discretionarySpending = DISCRETIONARY_CATEGORIES
    .filter((cat) => avgCategoryMap.has(cat))
    .map((cat) => ({ category: cat, spend: avgCategoryMap.get(cat)! }))
    .sort((a, b) => b.spend - a.spend);

  for (const { category, spend } of discretionarySpending) {
    if (cumulativeSaving >= additionalSavingsNeeded && additionalSavingsNeeded > 0)
      break;
    // Suggest 20-30% reduction
    const reductionPct = 0.25;
    const saving = Number((spend * reductionPct).toFixed(0));
    suggestedCuts.push({
      category,
      currentSpend: spend,
      suggestedSpend: spend - saving,
      potentialSaving: saving,
    });
    cumulativeSaving += saving;
  }

  return {
    avgMonthlyIncome,
    avgMonthlyExpense,
    currentMonthlySavings,
    targetAmount,
    targetMonths: targetMonths || null,
    requiredMonthlySavings,
    feasible,
    monthsToGoal,
    suggestedCuts,
  };
}
