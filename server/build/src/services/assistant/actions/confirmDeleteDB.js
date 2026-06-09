import { prisma } from "../../../lib";
export const ConfirmDeleteDB = async ({ userId, data, }) => {
    const filters = data.dbQueryFilters || {};
    const limit = filters.limit || 1;
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
        return {
            status: "success",
            msg: "No match found",
            action: "GENERAL",
            transactions: [],
            replyText: "I couldn't find any transaction matching that description in your database.",
        };
    }
    return {
        status: "success",
        msg: "Awaiting database deletion confirmation",
        action: "CONFIRM_DELETE_DB",
        transactions: transactions,
        replyText: `Your last ${transactions.length > 1 ? "transactions" : "transaction"} matching the description ${transactions.length > 1 ? "are" : "is"}: \nAre you sure you want to delete ${transactions.length > 1 ? "these transactions" : "this transaction"}?`,
    };
};
