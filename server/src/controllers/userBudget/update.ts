import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";
import { Prisma as P } from "../../../generated/prisma/client";
import { startOfMonth } from "../../utils/functions";
import redis from "../../lib/redis";

/**
 * PUT /user/budget
 * Upsert the user's monthly budget and optional category-wise budgets.
 */
const updateBudget = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId: clerkUserId } = req.auth();
    if (!clerkUserId) {
      return next(res.status(401).json({ status: "error", msg: "Unauthorized" }));
    }

    const { amount, month, categoryBudgets } = req.body;

    if (amount === undefined) {
      return next(
        res.status(400).json({ status: "error", msg: "Monthly budget amount is required" })
      );
    }

    const budgetAmount = new P.Decimal(amount);
    if (budgetAmount.isNegative()) {
      return next(
        res.status(400).json({ status: "error", msg: "Budget amount cannot be negative" })
      );
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
      // 1. Upsert UserBudget
      const userBudget = await tx.userBudget.upsert({
        where: {
          userId_month: {
            userId: user.id,
            month: targetMonth,
          },
        },
        update: {
          amount: budgetAmount,
        },
        create: {
          userId: user.id,
          month: targetMonth,
          amount: budgetAmount,
        },
      });

      // 2. Handle CategoryBudgets if provided
      if (categoryBudgets && Array.isArray(categoryBudgets)) {
        // Delete all existing category budgets for this month
        await tx.categoryBudget.deleteMany({
          where: { userBudgetId: userBudget.id },
        });

        // Insert new category budgets
        if (categoryBudgets.length > 0) {
          const categoryBudgetsData = categoryBudgets.map((cb: any) => {
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

      // Fetch the updated budget structure with categoryBudgets
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

    // 3. Calculate category total and warning if it exceeds overall budget
    const categoryTotal = result.categoryBudgets.reduce(
      (sum, cb) => sum.add(new P.Decimal(cb.amount.toString())),
      new P.Decimal(0)
    );
    const warning = categoryTotal.gt(new P.Decimal(result.amount.toString()))
      ? "Category budgets total exceeds the monthly budget"
      : undefined;

    // Clear dashboard cache
    const todayKey = new Date().toISOString().slice(0, 10);
    await redis.del(`dashboard:${clerkUserId}:${todayKey}`);

    // Clear budget cache for this month
    await redis.del(`budget:${clerkUserId}:${targetMonth.toISOString()}`);

    return next(
      res.status(200).json({
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
      })
    );
  } catch (error: any) {
    console.error("Update budget error:", error);
    return next(
      res.status(error.message?.includes("Category and amount") ? 400 : 500).json({
        status: "error",
        msg: error.message || "Internal server error",
      })
    );
  }
};

export default updateBudget;
