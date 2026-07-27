import { prisma } from "../../../lib/index.js";

// Multipliers to convert any interval to monthly cost
const INTERVAL_TO_MONTHLY: Record<string, number> = {
  DAILY: 30,
  WEEKLY: 4.33,
  MONTHLY: 1,
  YEARLY: 1 / 12,
};

export async function getRecurringExpenses({
  userId,
}: {
  userId: string;
}) {
  const transactions = await prisma.transaction.findMany({
    where: { userId, isRecurring: true },
    select: {
      description: true,
      amount: true,
      category: true,
      recurringInterval: true,
    },
    orderBy: { amount: "desc" },
  });

  // Deduplicate by description + category
  const seen = new Map<
    string,
    {
      description: string;
      amount: number;
      category: string;
      interval: string;
      monthlyCost: number;
    }
  >();

  for (const tx of transactions) {
    const key = `${tx.description}:${tx.category}`;
    if (seen.has(key)) continue;

    const amount = tx.amount.toNumber();
    const interval = tx.recurringInterval || "MONTHLY";
    const multiplier = INTERVAL_TO_MONTHLY[interval] || 1;
    const monthlyCost = Number((amount * multiplier).toFixed(0));

    seen.set(key, {
      description: tx.description || "Unknown",
      amount,
      category: tx.category,
      interval,
      monthlyCost,
    });
  }

  const recurring = Array.from(seen.values()).sort(
    (a, b) => b.monthlyCost - a.monthlyCost
  );
  const totalMonthly = recurring.reduce((sum, r) => sum + r.monthlyCost, 0);
  const totalAnnual = totalMonthly * 12;

  return {
    recurring,
    totalMonthly,
    totalAnnual,
  };
}
