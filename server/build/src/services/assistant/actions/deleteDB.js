import { prisma } from "../../../lib";
import { Prisma as P } from "../../../../generated/prisma/client";
import redis from "src/lib/redis";
import { invalidateTransactionListCache, startOfDay, startOfMonth, } from "src/utils/functions";
export const DeleteDB = async ({ userId, data, dbTransactionIds, clerkUserId, }) => {
    const idsToDelete = dbTransactionIds || [];
    if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) {
        return {
            status: "success",
            msg: "Deletion aborted",
            action: "GENERAL",
            replyText: "I couldn't verify which transaction to delete. Deletion aborted.",
            transactions: [],
        };
    }
    const transactions = await prisma.transaction.findMany({
        where: { id: { in: idsToDelete }, userId: userId },
    });
    if (transactions.length === 0) {
        return {
            status: "error",
            msg: "No matching transactions found",
            action: "GENERAL",
            replyText: "I couldn't find the transaction you wanted to delete. Deletion aborted.",
            transactions: [],
        };
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
                incomeMonthMap.set(monthKey, {
                    month,
                    totalDecrement: new P.Decimal(0),
                    categories: new Map(),
                });
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
                dayMap.set(dayKey, {
                    day,
                    totalDecrement: new P.Decimal(0),
                    categories: new Map(),
                });
            }
            const dayEntry = dayMap.get(dayKey);
            dayEntry.totalDecrement = dayEntry.totalDecrement.add(amount);
            dayEntry.categories.set(txn.category, (dayEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount));
            if (!monthMap.has(monthKey)) {
                monthMap.set(monthKey, {
                    month,
                    totalDecrement: new P.Decimal(0),
                    categories: new Map(),
                });
            }
            const monthEntry = monthMap.get(monthKey);
            monthEntry.totalDecrement = monthEntry.totalDecrement.add(amount);
            monthEntry.categories.set(txn.category, (monthEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount));
        }
    }
    await prisma.$transaction(async (tx) => {
        await tx.transaction.deleteMany({
            where: { id: { in: idsToDelete }, userId: userId },
        });
        if (!balanceChange.isZero()) {
            await tx.user.update({
                where: { id: userId },
                data: { balance: { increment: balanceChange } },
            });
        }
        if (dayMap.size > 0) {
            const dayDates = [...dayMap.values()].map((d) => d.day);
            const dailyExpenses = await tx.dailyExpense.findMany({
                where: { userId: userId, date: { in: dayDates } },
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
                where: { userId: userId, month: { in: monthDates } },
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
                where: { userId: userId, month: { in: monthDates } },
                include: { incomeItems: true },
            });
            const monthlyByMonth = new Map(monthlyIncomes.map((me) => [me.month.toISOString(), me]));
            const monthlyOps = [];
            for (const [monthKey, { totalDecrement, categories },] of incomeMonthMap) {
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
    data.replyText = `Successfully deleted the following transaction(s) from your database:\n${transactions.map((t) => `- ${t.description} | Rs. ${t.amount} | ${t.date.toISOString().slice(0, 10)}`).join("\n")}`;
    return {
        status: "success",
        msg: "Deleted",
        action: "GENERAL",
        replyText: data.replyText,
        transactions: [],
    };
};
