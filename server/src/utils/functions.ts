import { Decimal } from "generated/prisma/internal/prismaNamespace";

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function calculateNextRecurringDate(startDate: string, interval: string) {
  const date = new Date(startDate);

  switch (interval){
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
}

type CategoryItem = {
  category: string;
  amount: Decimal;
};

type CategoryOutput = {
  category: string;
  amount: Number;
  percentage: number;
};


export const getTopCategoriesWithOthersAndPercentage = (
  items: CategoryItem[],
  topN: number = 4,
  totalAmount: Decimal
): CategoryOutput[] => {
  if (!items || items.length === 0) return [];

  const normalized = items
    .map((item) => ({
      category: item.category,
      amount: Number(item.amount),
    }))

  const total = totalAmount.toNumber();
  if (total === 0) return [];

  // Top N
  const topCategories = normalized.slice(0, topN);

  // Remaining
  const remaining = normalized.slice(topN);

  let result = [...topCategories];

  // Merge Others if needed
  if (remaining.length > 0) {
    const othersTotal = remaining.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    result.push({
      category: "Others",
      amount: othersTotal,
    });
  }

  // Add percentage
  return result.map((item) => ({
    category: item.category,
    amount: item.amount,
    percentage: Number(((item.amount / total) * 100).toFixed(2)),
  }));


}