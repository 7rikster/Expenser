import { getOrGenerateMonthlyReview } from "./helper.js";


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

  const reviews = await Promise.all(
    months.map((m) => getOrGenerateMonthlyReview(userId, m))
  );

  const monthCount = Math.max(reviews.length, 1);
  const totalExpense = reviews.reduce(
    (sum, r) => sum + (Number(r.totalExpense) || 0),
    0
  );
  const totalIncome = reviews.reduce(
    (sum, r) => sum + (Number(r.totalIncome) || 0),
    0
  );

  const avgMonthlyExpense = Number((totalExpense / monthCount).toFixed(0));
  const avgMonthlyIncome = Number((totalIncome / monthCount).toFixed(0));
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
  const categorySumMap = new Map<string, number>();
  for (const r of reviews) {
    const breakdown = (r.categoryBreakdown as any[]) || [];
    for (const item of breakdown) {
      const amount = Number(item.amount) || 0;
      categorySumMap.set(item.category, (categorySumMap.get(item.category) || 0) + amount);
    }
  }

  const avgCategoryMap = new Map<string, number>();
  for (const [category, totalAmount] of categorySumMap.entries()) {
    avgCategoryMap.set(category, Number((totalAmount / monthCount).toFixed(0)));
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
