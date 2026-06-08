import { prisma } from "../../lib";
import { Prisma as P } from "../../../generated/prisma/client";
import { startOfMonth } from "../../utils/functions";
import redis from "../../lib/redis";
const updateBudget = async (req, res, next) => {
    try {
        const { userId: clerkUserId } = req.auth();
        if (!clerkUserId) {
            return next(res.status(401).json({ status: "error", msg: "Unauthorized" }));
        }
        const { amount, month, categoryBudgets } = req.body;
        if (amount === undefined) {
            return next(res.status(400).json({ status: "error", msg: "Monthly budget amount is required" }));
        }
        const budgetAmount = new P.Decimal(amount);
        if (budgetAmount.isNegative()) {
            return next(res.status(400).json({ status: "error", msg: "Budget amount cannot be negative" }));
        }
        const targetDate = month ? new Date(month) : new Date();
        const targetMonth = startOfMonth(targetDate);
        const user = await prisma.user.findUnique({
            where: { clerkUserId },
            select: { id: true },
        });
        if (!user) {
            return next(res.status(404).json({ status: "error", msg: "User not found" }));
        }
        const result = await prisma.$transaction(async (tx) => {
            const userBudget = await tx.userBudget.upsert({
                where: {
                    userId_month: {
                        userId: user.id,
                        month: targetMonth,
                    },
                },
                update: {
                    amount: budgetAmount,
                    warningDismissed: false,
                },
                create: {
                    userId: user.id,
                    month: targetMonth,
                    amount: budgetAmount,
                    warningDismissed: false,
                },
            });
            if (categoryBudgets && Array.isArray(categoryBudgets)) {
                await tx.categoryBudget.deleteMany({
                    where: { userBudgetId: userBudget.id },
                });
                if (categoryBudgets.length > 0) {
                    const categoryBudgetsData = categoryBudgets.map((cb) => {
                        if (!cb.category || cb.amount === undefined) {
                            throw new Error("Category and amount are required for category budgets");
                        }
                        return {
                            userBudgetId: userBudget.id,
                            category: cb.category,
                            amount: new P.Decimal(cb.amount),
                        };
                    });
                    await tx.categoryBudget.createMany({
                        data: categoryBudgetsData,
                    });
                }
            }
            const finalBudget = await tx.userBudget.findUnique({
                where: { id: userBudget.id },
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
            return finalBudget;
        });
        if (!result) {
            return next(res.status(500).json({ status: "error", msg: "Failed to update budget" }));
        }
        const categoryTotal = result.categoryBudgets.reduce((sum, cb) => sum.add(new P.Decimal(cb.amount.toString())), new P.Decimal(0));
        const warning = categoryTotal.gt(new P.Decimal(result.amount.toString())) && !result.warningDismissed
            ? "Category budgets total exceeds the monthly budget"
            : undefined;
        const todayKey = new Date().toISOString().slice(0, 10);
        await redis.del(`dashboard:${clerkUserId}:${todayKey}`);
        await redis.del(`budget:${clerkUserId}:${targetMonth.toISOString()}`);
        return next(res.status(200).json({
            status: "success",
            data: {
                ...result,
                amount: Number(result.amount),
                categoryBudgets: result.categoryBudgets.map((cb) => ({
                    ...cb,
                    amount: Number(cb.amount),
                })),
                ...(warning && { warning }),
            },
        }));
    }
    catch (error) {
        console.error("Update budget error:", error);
        return next(res.status(error.message?.includes("Category and amount") ? 400 : 500).json({
            status: "error",
            msg: error.message || "Internal server error",
        }));
    }
};
export default updateBudget;
