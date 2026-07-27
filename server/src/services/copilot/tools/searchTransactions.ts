import { prisma } from "../../../lib/index.js";

export async function searchTransactions({
  userId,
  args,
}: {
  userId: string;
  args: {
    limit?: number;
    category?: string;
    type?: "INCOME" | "EXPENSE";
    merchantName?: string;
    startDate?: string;
    endDate?: string;
  };
}) {
  const limit = args.limit || 10;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(args.category && { category: args.category }),
      ...(args.type && { type: args.type }),
      ...(args.merchantName && {
        description: {
          contains: args.merchantName,
          mode: "insensitive" as const,
        },
      }),
      ...(args.startDate &&
        args.endDate && {
          date: {
            gte: new Date(args.startDate),
            lte: new Date(args.endDate),
          },
        }),
      ...(args.startDate &&
        !args.endDate && { date: { gte: new Date(args.startDate) } }),
      ...(!args.startDate &&
        args.endDate && { date: { lte: new Date(args.endDate) } }),
    },
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      date: true,
      category: true,
    },
  });

  return {
    transactions: transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount.toNumber(),
      description: tx.description,
      date: tx.date.toISOString().slice(0, 10),
      category: tx.category,
    })),
    count: transactions.length,
  };
}
