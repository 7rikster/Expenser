import { prisma } from "../../lib";
import { endOfMonth, startOfMonth } from "src/utils/functions";
export async function calculateBudgetInsights(userId, date) {
    const monthStart = startOfMonth(date);
    const insights = [];
    const userBudget = await prisma.userBudget.findUnique({
        where: { userId_month: { userId, month: monthStart } },
        include: { categoryBudgets: true },
    });
    if (!userBudget)
        return [];
    const totalBudget = Number(userBudget.amount);
    const monthlyExpense = await prisma.monthlyExpense.findUnique({
        where: { userId_month: { userId, month: monthStart } },
        include: { expenseItems: true },
    });
    if (!monthlyExpense)
        return [];
    const actualSpend = Number(monthlyExpense.total);
    if (actualSpend > totalBudget) {
        insights.push({
            type: "budget_exceeded",
            title: "Monthly budget exceeded",
            message: `You've spent ₹${(actualSpend - totalBudget).toFixed(0)} over your monthly budget of ₹${totalBudget}.`,
            data: { actualSpend, totalBudget, exceeded: actualSpend - totalBudget },
        });
    }
    const totalDaysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const currentDay = date.getDate();
    const daysRatio = currentDay / totalDaysInMonth;
    const budgetRatio = actualSpend / totalBudget;
    if (daysRatio < 0.8 && budgetRatio > daysRatio + 0.15) {
        const projectedSpend = (actualSpend / currentDay) * totalDaysInMonth;
        insights.push({
            type: "burn_rate_alert",
            title: "Spending faster than planned",
            message: `${(daysRatio * 100).toFixed(0)}% of the month is done, but you've used ${(budgetRatio * 100).toFixed(0)}% of your budget. At this pace, you may spend ~₹${projectedSpend.toFixed(0)} by month end.`,
            data: { daysRatio, budgetRatio, projectedSpend },
        });
    }
    const expenseItemMap = new Map(monthlyExpense.expenseItems.map((item) => [
        item.category,
        Number(item.amount),
    ]));
    for (const catBudget of userBudget.categoryBudgets) {
        const catSpent = expenseItemMap.get(catBudget.category) || 0;
        const catLimit = Number(catBudget.amount);
        if (catSpent > catLimit) {
            insights.push({
                type: "budget_exceeded",
                title: `${catBudget.category} budget exceeded`,
                message: `You've spent ₹${catSpent.toFixed(0)} on ${catBudget.category}, exceeding the ₹${catLimit.toFixed(0)} budget by ₹${(catSpent - catLimit).toFixed(0)}.`,
                data: {
                    category: catBudget.category,
                    spent: catSpent,
                    limit: catLimit,
                },
            });
        }
    }
    return insights;
}
export async function calculateTrendInsights(userId, date) {
    const currentStart = startOfMonth(date);
    const currentEnd = endOfMonth(date);
    const previousMonthDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
    const prevStart = startOfMonth(previousMonthDate);
    const prevEnd = endOfMonth(previousMonthDate);
    const [currentGroups, prevGroups] = await Promise.all([
        prisma.transaction.groupBy({
            by: ["category"],
            where: {
                userId,
                type: "EXPENSE",
                date: { gte: currentStart, lte: currentEnd },
            },
            _sum: { amount: true },
        }),
        prisma.transaction.groupBy({
            by: ["category"],
            where: {
                userId,
                type: "EXPENSE",
                date: { gte: prevStart, lte: prevEnd },
            },
            _sum: { amount: true },
        }),
    ]);
    const prevMap = new Map(prevGroups.map((g) => [g.category, g._sum.amount?.toNumber() || 0]));
    const currMap = new Map(currentGroups.map((g) => [g.category, g._sum.amount?.toNumber() || 0]));
    const insights = [];
    const allCategories = new Set([...prevMap.keys(), ...currMap.keys()]);
    const changes = [];
    for (const cat of allCategories) {
        const prev = prevMap.get(cat) || 0;
        const curr = currMap.get(cat) || 0;
        const diff = curr - prev;
        if (Math.abs(diff) > 200) {
            const pct = prev === 0 ? 100 : Number(((diff / prev) * 100).toFixed(1));
            changes.push({ category: cat, prev, curr, diff, pct });
        }
    }
    changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    for (const change of changes.slice(0, 3)) {
        const direction = change.diff > 0 ? "increased" : "decreased";
        insights.push({
            type: "trend_shift",
            title: `${change.category} spending ${direction}`,
            message: `${change.category} spending ${direction} by ${Math.abs(change.pct)}% compared to last month (₹${change.prev.toFixed(0)} → ₹${change.curr.toFixed(0)}).`,
            data: change,
        });
    }
    const totalPrev = [...prevMap.values()].reduce((a, b) => a + b, 0);
    const totalCurr = [...currMap.values()].reduce((a, b) => a + b, 0);
    const overallDiff = totalCurr - totalPrev;
    if (totalPrev > 0 && Math.abs(overallDiff) > 500) {
        const pct = Number(((overallDiff / totalPrev) * 100).toFixed(1));
        const direction = overallDiff > 0 ? "up" : "down";
        insights.push({
            type: "trend_shift",
            title: `Overall spending is ${direction}`,
            message: `Total spending is ${direction} ${Math.abs(pct)}% compared to last month (₹${totalPrev.toFixed(0)} → ₹${totalCurr.toFixed(0)}).`,
            data: { totalPrev, totalCurr, diff: overallDiff, pct },
        });
    }
    return insights;
}
export async function calculatePredictionInsight(userId, date) {
    const monthStart = startOfMonth(date);
    const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const currentDay = Math.max(1, date.getDate());
    if (currentDay < 5)
        return null;
    const monthlyExpense = await prisma.monthlyExpense.findUnique({
        where: { userId_month: { userId, month: monthStart } },
    });
    if (!monthlyExpense)
        return null;
    const actualSpend = Number(monthlyExpense.total);
    const predicted = (actualSpend / currentDay) * totalDays;
    return {
        type: "end_of_month_prediction",
        title: "Projected month-end spending",
        message: `At your current pace (₹${(actualSpend / currentDay).toFixed(0)}/day), you'll spend approximately ₹${predicted.toFixed(0)} this month.`,
        data: {
            actualSpend,
            dailyAvg: actualSpend / currentDay,
            predicted,
            daysElapsed: currentDay,
            totalDays,
        },
    };
}
export async function generateAllInsights(userId, date) {
    const monthStart = startOfMonth(date);
    const [budgetInsights, trendInsights, prediction] = await Promise.all([
        calculateBudgetInsights(userId, date),
        calculateTrendInsights(userId, date),
        calculatePredictionInsight(userId, date),
    ]);
    const allInsights = [
        ...budgetInsights,
        ...trendInsights,
    ];
    if (prediction)
        allInsights.push(prediction);
    await prisma.spendingInsight.deleteMany({
        where: { userId, month: monthStart },
    });
    if (allInsights.length > 0) {
        await prisma.spendingInsight.createMany({
            data: allInsights.map((ins) => ({
                userId,
                type: ins.type,
                title: ins.title,
                message: ins.message,
                month: monthStart,
                data: ins.data || undefined,
            })),
        });
    }
}
