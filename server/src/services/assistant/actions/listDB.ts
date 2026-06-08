import { AssistantActionContext } from "../types";
import { prisma } from "../../../lib";

export const ListDB = async ({ userId, data }: AssistantActionContext) => {
  const filters = data.dbQueryFilters || {};
  const limit = filters.limit || 5;
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: userId,
      ...(filters.category && { category: filters.category }),
      ...(filters.type && { type: filters.type }),
      ...(filters.merchantName && {
        description: {
          contains: filters.merchantName,
          mode: "insensitive",
        },
      }),
      ...(filters.startDate &&
        filters.endDate && {
          date: {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate),
          },
        }),
      ...(filters.startDate &&
        !filters.endDate && { date: { gte: new Date(filters.startDate) } }),
      ...(!filters.startDate &&
        filters.endDate && { date: { lte: new Date(filters.endDate) } }),
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
  if (transactions.length === 0) {
    data.replyText =
      "I couldn't find any logged transactions matching those filters.";
  } else {
    data.replyText = `Here are your last ${transactions.length} logged ${transactions.length === 1 ? "transaction" : "transactions"}:`;
  }
  return {
    status: "success",
    msg: "Fetched transactions successfully",
    action: "LIST_DB",
    transactions,
    replyText: data.replyText,
  };
};
