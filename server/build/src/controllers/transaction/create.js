import { prisma } from "../../lib";
import { calculateNextRecurringDate, startOfDay, startOfMonth, getWeekStart, toLocalDateString, invalidateTransactionListCache } from "src/utils/functions";
import { Prisma as P } from "../../../generated/prisma/client";
import redis from "src/lib/redis";
const create = async (req, res, next) => {
    try {
        const { userId: clerkUserId } = req.auth();
        if (!clerkUserId) {
            return next(res.status(401).json({
                status: "error",
                msg: "Unauthorized",
            }));
        }
        const user = await prisma.user.findUnique({
            where: { clerkUserId },
        });
        if (!user) {
            return next(res.status(404).json({
                status: "error",
                msg: "User not found",
            }));
        }
        const { amount, category, description, receiptUrl, date, type, isRecurring, recurringInterval, lastProcessed } = req.body;
        if (!amount || !category || (type !== "EXPENSE" && type !== "INCOME")) {
            return next(res.status(400).json({
                status: "error",
                msg: "Amount, type and category are required",
            }));
        }
        if (isRecurring) {
            if (!recurringInterval) {
                return next(res.status(400).json({
                    status: "error",
                    msg: "Recurring interval is required for recurring transactions",
                }));
            }
        }
        const expenseAmount = new P.Decimal(amount);
        const expenseDate = date ? new Date(date) : new Date();
        const day = startOfDay(expenseDate);
        const month = startOfMonth(expenseDate);
        const monthStart = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), 1);
        const weekStart = toLocalDateString(getWeekStart(expenseDate));
        const todayKey = new Date().toISOString().slice(0, 10);
        const cacheKey = `dashboard:${clerkUserId}:${todayKey}`;
        const monthlyTrendCacheKey = `monthly-trend:${clerkUserId}:${new Date().toISOString().slice(0, 7)}`;
        const weeklyPatternCacheKey = `weekly-spending:${clerkUserId}:${weekStart}`;
        const categoryBreakdown = `category-breakdown:${clerkUserId}:${monthStart}`;
        console.log("weekStart: ", weekStart);
        const transaction = await prisma.$transaction(async (tx) => {
            const newTransaction = await tx.transaction.create({
                data: {
                    type,
                    amount: expenseAmount,
                    category,
                    description,
                    receiptUrl,
                    date: expenseDate,
                    isRecurring: isRecurring || false,
                    recurringInterval: isRecurring ? recurringInterval : null,
                    nextRecurringDate: isRecurring && recurringInterval ? calculateNextRecurringDate(date, recurringInterval) : null,
                    lastProcessed: isRecurring && lastProcessed ? new Date(lastProcessed) : null,
                    userId: user.id,
                },
            });
            if (type === "EXPENSE") {
                const balanceUpdate = tx.user.update({
                    where: { id: user.id },
                    data: { balance: { decrement: expenseAmount } },
                });
                const dailyFlow = async () => {
                    const dailyExpense = await tx.dailyExpense.upsert({
                        where: {
                            userId_date: {
                                userId: user.id,
                                date: day,
                            },
                        },
                        update: {
                            total: { increment: expenseAmount },
                        },
                        create: {
                            userId: user.id,
                            date: day,
                            total: expenseAmount,
                        },
                    });
                    await tx.dailyExpenseItem.upsert({
                        where: {
                            dailyId_category: {
                                dailyId: dailyExpense.id,
                                category,
                            },
                        },
                        update: {
                            amount: { increment: expenseAmount },
                        },
                        create: {
                            dailyId: dailyExpense.id,
                            category,
                            amount: expenseAmount,
                        },
                    });
                };
                const monthlyFlow = async () => {
                    const monthlyExpense = await tx.monthlyExpense.upsert({
                        where: {
                            userId_month: {
                                userId: user.id,
                                month,
                            },
                        },
                        update: {
                            total: { increment: expenseAmount },
                        },
                        create: {
                            userId: user.id,
                            month,
                            total: expenseAmount,
                        },
                    });
                    await tx.monthlyExpenseItem.upsert({
                        where: {
                            monthId_category: {
                                monthId: monthlyExpense.id,
                                category,
                            },
                        },
                        update: {
                            amount: { increment: expenseAmount },
                        },
                        create: {
                            monthId: monthlyExpense.id,
                            category,
                            amount: expenseAmount,
                        },
                    });
                };
                await Promise.all([balanceUpdate, dailyFlow(), monthlyFlow()]);
            }
            else if (type === "INCOME") {
                const balanceUpdate = tx.user.update({
                    where: { id: user.id },
                    data: { balance: { increment: expenseAmount } },
                });
                const monthlyIncomeFlow = async () => {
                    const monthlyIncome = await tx.monthlyIncome.upsert({
                        where: {
                            userId_month: {
                                userId: user.id,
                                month,
                            },
                        },
                        update: {
                            total: { increment: expenseAmount },
                        },
                        create: {
                            userId: user.id,
                            month,
                            total: expenseAmount,
                        },
                    });
                    await tx.monthlyIncomeItem.upsert({
                        where: {
                            monthId_category: {
                                monthId: monthlyIncome.id,
                                category,
                            },
                        },
                        update: {
                            amount: { increment: expenseAmount },
                        },
                        create: {
                            monthId: monthlyIncome.id,
                            category,
                            amount: expenseAmount,
                        },
                    });
                };
                await Promise.all([balanceUpdate, monthlyIncomeFlow()]);
            }
            await redis.del(cacheKey);
            await redis.del(monthlyTrendCacheKey);
            await redis.del(weeklyPatternCacheKey);
            await redis.del(categoryBreakdown);
            await invalidateTransactionListCache(redis, clerkUserId);
            return newTransaction;
        }, { timeout: 15000 });
        return next(res.status(201).json({
            status: "success",
            data: transaction,
        }));
    }
    catch (error) {
        console.error("Create expense error:", error);
        return next(res.status(500).json({
            status: "error",
            msg: "Internal server error",
        }));
    }
};
export default create;
