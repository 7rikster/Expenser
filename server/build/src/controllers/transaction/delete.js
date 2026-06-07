import { prisma } from "../../lib";
import { startOfDay, startOfMonth, invalidateTransactionListCache } from "src/utils/functions";
import { Prisma as P } from "../../../generated/prisma/client";
import redis from "src/lib/redis";
const deleteTransaction = async (req, res, next) => {
    try {
        const { userId: clerkUserId } = req.auth();
        if (!clerkUserId) {
            return next(res.status(401).json({ status: "error", msg: "Unauthorized" }));
        }
        const user = await prisma.user.findUnique({
            where: { clerkUserId },
            select: { id: true },
        });
        if (!user) {
            return next(res.status(404).json({ status: "error", msg: "User not found" }));
        }
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return next(res.status(400).json({ status: "error", msg: "ids must be a non-empty array" }));
        }
        const transactions = await prisma.transaction.findMany({
            where: { id: { in: ids }, userId: user.id },
        });
        if (transactions.length === 0) {
            return next(res.status(404).json({ status: "error", msg: "No matching transactions found" }));
        }
        const dayMap = new Map();
        const monthMap = new Map();
        const incomeMonthMap = new Map();
        let balanceChange = new P.Decimal(0);
        for (const txn of transactions) {
            const amount = new P.Decimal(txn.amount.toString());
            if (txn.type === "INCOME") {
                balanceChange = balanceChange.sub(amount);
                const month = startOfMonth(txn.date);
                const monthKey = month.toISOString();
                if (!incomeMonthMap.has(monthKey)) {
                    incomeMonthMap.set(monthKey, { month, totalDecrement: new P.Decimal(0), categories: new Map() });
                }
                const monthEntry = incomeMonthMap.get(monthKey);
                monthEntry.totalDecrement = monthEntry.totalDecrement.add(amount);
                monthEntry.categories.set(txn.category, (monthEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount));
            }
            else if (txn.type === "EXPENSE") {
                balanceChange = balanceChange.add(amount);
                const day = startOfDay(txn.date);
                const month = startOfMonth(txn.date);
                const dayKey = day.toISOString();
                const monthKey = month.toISOString();
                if (!dayMap.has(dayKey)) {
                    dayMap.set(dayKey, { day, totalDecrement: new P.Decimal(0), categories: new Map() });
                }
                const dayEntry = dayMap.get(dayKey);
                dayEntry.totalDecrement = dayEntry.totalDecrement.add(amount);
                dayEntry.categories.set(txn.category, (dayEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount));
                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, { month, totalDecrement: new P.Decimal(0), categories: new Map() });
                }
                const monthEntry = monthMap.get(monthKey);
                monthEntry.totalDecrement = monthEntry.totalDecrement.add(amount);
                monthEntry.categories.set(txn.category, (monthEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount));
            }
        }
        await prisma.$transaction(async (tx) => {
            await tx.transaction.deleteMany({ where: { id: { in: ids }, userId: user.id } });
            if (!balanceChange.isZero()) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { balance: { increment: balanceChange } },
                });
            }
            if (dayMap.size > 0) {
                const dayDates = [...dayMap.values()].map((d) => d.day);
                const dailyExpenses = await tx.dailyExpense.findMany({
                    where: { userId: user.id, date: { in: dayDates } },
                    include: { expenseItems: true },
                });
                const dailyByDate = new Map(dailyExpenses.map((de) => [de.date.toISOString(), de]));
                const dailyOps = [];
                for (const [dayKey, { totalDecrement, categories }] of dayMap) {
                    const daily = dailyByDate.get(dayKey);
                    if (!daily)
                        continue;
                    const newTotal = daily.total.sub(totalDecrement);
                    if (newTotal.lte(0)) {
                        dailyOps.push(tx.dailyExpense.delete({ where: { id: daily.id } }));
                    }
                    else {
                        dailyOps.push(tx.dailyExpense.update({
                            where: { id: daily.id },
                            data: { total: { decrement: totalDecrement } },
                        }));
                        const itemsByCategory = new Map(daily.expenseItems.map((item) => [item.category, item]));
                        for (const [category, catDecrement] of categories) {
                            const item = itemsByCategory.get(category);
                            if (!item)
                                continue;
                            const newItemTotal = item.amount.sub(catDecrement);
                            if (newItemTotal.lte(0)) {
                                dailyOps.push(tx.dailyExpenseItem.delete({ where: { id: item.id } }));
                            }
                            else {
                                dailyOps.push(tx.dailyExpenseItem.update({
                                    where: { id: item.id },
                                    data: { amount: { decrement: catDecrement } },
                                }));
                            }
                        }
                    }
                }
                await Promise.all(dailyOps);
            }
            if (monthMap.size > 0) {
                const monthDates = [...monthMap.values()].map((m) => m.month);
                const monthlyExpenses = await tx.monthlyExpense.findMany({
                    where: { userId: user.id, month: { in: monthDates } },
                    include: { expenseItems: true },
                });
                const monthlyByMonth = new Map(monthlyExpenses.map((me) => [me.month.toISOString(), me]));
                const monthlyOps = [];
                for (const [monthKey, { totalDecrement, categories }] of monthMap) {
                    const monthly = monthlyByMonth.get(monthKey);
                    if (!monthly)
                        continue;
                    const newTotal = monthly.total.sub(totalDecrement);
                    if (newTotal.lte(0)) {
                        monthlyOps.push(tx.monthlyExpense.delete({ where: { id: monthly.id } }));
                    }
                    else {
                        monthlyOps.push(tx.monthlyExpense.update({
                            where: { id: monthly.id },
                            data: { total: { decrement: totalDecrement } },
                        }));
                        const itemsByCategory = new Map(monthly.expenseItems.map((item) => [item.category, item]));
                        for (const [category, catDecrement] of categories) {
                            const item = itemsByCategory.get(category);
                            if (!item)
                                continue;
                            const newItemTotal = item.amount.sub(catDecrement);
                            if (newItemTotal.lte(0)) {
                                monthlyOps.push(tx.monthlyExpenseItem.delete({ where: { id: item.id } }));
                            }
                            else {
                                monthlyOps.push(tx.monthlyExpenseItem.update({
                                    where: { id: item.id },
                                    data: { amount: { decrement: catDecrement } },
                                }));
                            }
                        }
                    }
                }
                await Promise.all(monthlyOps);
            }
            if (incomeMonthMap.size > 0) {
                const monthDates = [...incomeMonthMap.values()].map((m) => m.month);
                const monthlyIncomes = await tx.monthlyIncome.findMany({
                    where: { userId: user.id, month: { in: monthDates } },
                    include: { incomeItems: true },
                });
                const monthlyByMonth = new Map(monthlyIncomes.map((me) => [me.month.toISOString(), me]));
                const monthlyOps = [];
                for (const [monthKey, { totalDecrement, categories }] of incomeMonthMap) {
                    const monthly = monthlyByMonth.get(monthKey);
                    if (!monthly)
                        continue;
                    const newTotal = monthly.total.sub(totalDecrement);
                    if (newTotal.lte(0)) {
                        monthlyOps.push(tx.monthlyIncome.delete({ where: { id: monthly.id } }));
                    }
                    else {
                        monthlyOps.push(tx.monthlyIncome.update({
                            where: { id: monthly.id },
                            data: { total: { decrement: totalDecrement } },
                        }));
                        const itemsByCategory = new Map(monthly.incomeItems.map((item) => [item.category, item]));
                        for (const [category, catDecrement] of categories) {
                            const item = itemsByCategory.get(category);
                            if (!item)
                                continue;
                            const newItemTotal = item.amount.sub(catDecrement);
                            if (newItemTotal.lte(0)) {
                                monthlyOps.push(tx.monthlyIncomeItem.delete({ where: { id: item.id } }));
                            }
                            else {
                                monthlyOps.push(tx.monthlyIncomeItem.update({
                                    where: { id: item.id },
                                    data: { amount: { decrement: catDecrement } },
                                }));
                            }
                        }
                    }
                }
                await Promise.all(monthlyOps);
            }
        }, { timeout: 30000 });
        const todayKey = new Date().toISOString().slice(0, 10);
        const monthlyTrendCacheKey = `monthly-trend:${clerkUserId}:${new Date().toISOString().slice(0, 7)}`;
        await redis.del(`dashboard:${clerkUserId}:${todayKey}`);
        await redis.del(monthlyTrendCacheKey);
        let cursor = "0";
        const pattern = `weekly-spending:${clerkUserId}:*`;
        do {
            const result = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
            cursor = result[0];
            const keys = result[1];
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== "0");
        let cursor1 = "0";
        const pattern1 = `category-breakdown:${clerkUserId}:*`;
        do {
            const result = await redis.scan(cursor1, "MATCH", pattern1, "COUNT", 100);
            cursor1 = result[0];
            const keys = result[1];
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor1 !== "0");
        await invalidateTransactionListCache(redis, clerkUserId);
        return next(res.status(200).json({
            status: "success",
            msg: `${transactions.length} transaction(s) deleted`,
            deletedCount: transactions.length,
        }));
    }
    catch (error) {
        console.error("Bulk delete transaction error:", error);
        return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
    }
};
export default deleteTransaction;
