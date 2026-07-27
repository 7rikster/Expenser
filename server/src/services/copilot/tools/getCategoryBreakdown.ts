import { prisma } from "../../../lib/index.js";
import { startOfMonth, endOfMonth } from "src/utils/functions";
import { getOrGenerateMonthlyReview } from "./helper.js";

function parseMonth(monthStr?: string): Date {
  if (!monthStr) return startOfMonth(new Date());
  const parts = monthStr.split("-");
  return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
}

export async function getCategoryBreakdown({
  userId,
  args,
}: {
  userId: string;
  args: { month?: string; category?: string };
}) {
  const monthDate = parseMonth(args.month);
  const monthEnd = endOfMonth(monthDate);

  // If a specific category is requested, get merchant-level breakdown
  if (args.category) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        category: args.category,
        date: { gte: monthDate, lte: monthEnd },
      },
      select: { description: true, amount: true },
    });

    const merchantMap = new Map<string, number>();
    let totalAmount = 0;

    for (const tx of transactions) {
      const merchant = tx.description
        ? tx.description.split(" - ")[0].trim()
        : "Others";
      const amount = tx.amount.toNumber();
      merchantMap.set(merchant, (merchantMap.get(merchant) || 0) + amount);
      totalAmount += amount;
    }

    const merchants = Array.from(merchantMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({
        name,
        amount,
        percentage:
          totalAmount === 0
            ? 0
            : Number(((amount / totalAmount) * 100).toFixed(1)),
      }));

    return {
      month: monthDate.toISOString().slice(0, 7),
      category: args.category,
      totalAmount,
      merchants,
    };
  }

  // Overall category breakdown
  const review = await getOrGenerateMonthlyReview(userId, monthDate);
  const totalExpense = Number(review.totalExpense);

  const categories = ((review.categoryBreakdown as any[]) || []).map((c) => ({
    category: c.category,
    amount: Number(c.amount) || 0,
    percentage: Number(c.percentage) || 0,
    subCategories: c.subCategories,
  }));

  return {
    month: monthDate.toISOString().slice(0, 7),
    totalExpense,
    categories,
  };
}
 