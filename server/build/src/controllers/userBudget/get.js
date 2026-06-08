import { prisma } from "../../lib";
import { Prisma as P } from "../../../generated/prisma/client";
import { startOfMonth } from "../../utils/functions";
import redis from "../../lib/redis";
const getBudget = async (req, res, next) => {
    try {
        const { userId: clerkUserId } = req.auth();
        if (!clerkUserId) {
            return next(res.status(401).json({ status: "error", msg: "Unauthorized" }));
        }
        const monthParam = req.query.month;
        const targetDate = monthParam ? new Date(monthParam) : new Date();
        const targetMonth = startOfMonth(targetDate);
        const cacheKey = `budget:${clerkUserId}:${targetMonth.toISOString()}`;
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return next(res.status(200).json({ status: "success", data: JSON.parse(cachedData) }));
        }
        const user = await prisma.user.findUnique({
            where: { clerkUserId },
            select: { id: true },
        });
        if (!user) {
            return next(res.status(404).json({ status: "error", msg: "User not found" }));
        }
        const currentBudget = await prisma.userBudget.findUnique({
            where: {
                userId_month: {
                    userId: user.id,
                    month: targetMonth,
                },
            },
            include: {
                categoryBudgets: {
                    select: {
                        id: true,
                        category: true,
                        amount: true,
                    },
                },
            },
        });
        if (currentBudget) {
            const categoryTotal = currentBudget.categoryBudgets.reduce((sum, cb) => sum.add(new P.Decimal(cb.amount.toString())), new P.Decimal(0));
            const warning = categoryTotal.gt(new P.Decimal(currentBudget.amount.toString())) && !currentBudget.warningDismissed
                ? "Category budgets total exceeds the monthly budget"
                : undefined;
            const responseData = {
                budgetStatus: "active",
                budget: {
                    id: currentBudget.id,
                    amount: Number(currentBudget.amount),
                    month: currentBudget.month,
                    warningDismissed: currentBudget.warningDismissed,
                    categoryBudgets: currentBudget.categoryBudgets.map((cb) => ({
                        ...cb,
                        amount: Number(cb.amount),
                    })),
                },
                ...(warning && { warning }),
            };
            await redis.set(cacheKey, JSON.stringify(responseData), "EX", 60);
            return next(res.status(200).json({ status: "success", data: responseData }));
        }
        const previousBudget = await prisma.userBudget.findFirst({
            where: { userId: user.id },
            orderBy: { month: "desc" },
            include: {
                categoryBudgets: {
                    select: {
                        id: true,
                        category: true,
                        amount: true,
                    },
                },
            },
        });
        if (previousBudget) {
            const responseData = {
                budgetStatus: "template",
                budget: {
                    id: previousBudget.id,
                    amount: Number(previousBudget.amount),
                    month: previousBudget.month,
                    warningDismissed: previousBudget.warningDismissed,
                    categoryBudgets: previousBudget.categoryBudgets.map((cb) => ({
                        ...cb,
                        amount: Number(cb.amount),
                    })),
                },
                templateMonth: previousBudget.month,
            };
            await redis.set(cacheKey, JSON.stringify(responseData), "EX", 30);
            return next(res.status(200).json({ status: "success", data: responseData }));
        }
        const responseData = {
            budgetStatus: "none",
        };
        await redis.set(cacheKey, JSON.stringify(responseData), "EX", 30);
        return next(res.status(200).json({ status: "success", data: responseData }));
    }
    catch (error) {
        console.error("Get budget error:", error);
        return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
    }
};
export default getBudget;
