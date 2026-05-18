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

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the Monday (start) of the week for a given date.
 * Uses ISO week convention: Monday = start of week.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Shift so Monday = 0
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the day after Sunday (exclusive end) for a given week start (Monday).
 */
export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 7); // exclusive end (Monday of next week)
  d.setHours(0, 0, 0, 0);
  return d;
}