import { prisma } from "../lib";
import { getTopCategoriesWithOthersAndPercentage, startOfDay, startOfMonth } from "./functions";
export const getDayExpense = async (userId, date = new Date()) => {
    const day = startOfDay(date);
    const daily = await prisma.dailyExpense.findUnique({
        where: {
            userId_date: {
                userId,
                date: day,
            },
        },
        select: {
            date: true,
            total: true,
            expenseItems: {
                select: {
                    category: true,
                    amount: true,
                },
                orderBy: {
                    amount: "desc",
                },
            },
        },
    });
    if (!daily) {
        return {
            total: 0,
            categories: [],
        };
    }
    const categories = getTopCategoriesWithOthersAndPercentage(daily.expenseItems, 4, daily.total);
    return {
        total: daily.total,
        categories,
    };
};
export const getThisMonthExpense = async (userId, date = new Date()) => {
    const monthStart = startOfMonth(date);
    const monthly = await prisma.monthlyExpense.findUnique({
        where: {
            userId_month: {
                userId,
                month: monthStart,
            },
        },
        select: {
            month: true,
            total: true,
            expenseItems: {
                select: {
                    category: true,
                    amount: true,
                },
                orderBy: {
                    amount: "desc",
                },
            },
        },
    });
    if (!monthly) {
        return {
            total: 0,
            categories: [],
        };
    }
    const categories = getTopCategoriesWithOthersAndPercentage(monthly.expenseItems, 4, monthly.total);
    return {
        total: monthly.total,
        categories,
    };
};
export const getThisMonthIncome = async (userId, date = new Date()) => {
    const monthStart = startOfMonth(date);
    const monthly = await prisma.monthlyIncome.findUnique({
        where: {
            userId_month: {
                userId,
                month: monthStart,
            },
        },
        select: {
            month: true,
            total: true,
            incomeItems: {
                select: {
                    category: true,
                    amount: true,
                },
                orderBy: {
                    amount: "desc",
                },
            },
        },
    });
    if (!monthly) {
        return {
            total: 0,
            categories: [],
        };
    }
    const categories = getTopCategoriesWithOthersAndPercentage(monthly.incomeItems, 4, monthly.total);
    return {
        total: monthly.total,
        categories,
    };
};
