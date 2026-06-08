import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";
import { Prisma as P } from "../../../generated/prisma/client";
import { startOfMonth } from "../../utils/functions";
import redis from "../../lib/redis";

/**
 * GET /budget
 * Fetch the user's monthly budget for a given month (defaults to current month).
 *
 * Query params:
 *   - month (optional): ISO date string, e.g. "2026-06" or "2026-06-01"
 *
 * Response shape:
 *   - budgetStatus: "active" | "template" | "none"
 *   - budget: the budget data (if active or template)
 *   - templateMonth: the month the template came from (if template)
 *   - warning: if category budgets total exceeds monthly budget
 */
const getBudget = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId: clerkUserId } = req.auth();
    if (!clerkUserId) {
      return next(res.status(401).json({ status: "error", msg: "Unauthorized" }));
    }

    // Determine target month
    const monthParam = req.query.month as string | undefined;
    const targetDate = monthParam ? new Date(monthParam) : new Date();
    const targetMonth = startOfMonth(targetDate);

    // Check Redis cache
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

    // 1. Try to find this month's budget
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
      // Active budget found for this month
      const categoryTotal = currentBudget.categoryBudgets.reduce(
        (sum, cb) => sum.add(new P.Decimal(cb.amount.toString())),
        new P.Decimal(0)
      );
      const warning = categoryTotal.gt(new P.Decimal(currentBudget.amount.toString()))
        ? "Category budgets total exceeds the monthly budget"
        : undefined;

      const responseData = {
        budgetStatus: "active" as const,
        budget: {
          id: currentBudget.id,
          amount: Number(currentBudget.amount),
          month: currentBudget.month,
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

    // 2. No budget for this month — look for the most recent one as a template
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
        budgetStatus: "template" as const,
        budget: {
          id: previousBudget.id,
          amount: Number(previousBudget.amount),
          month: previousBudget.month,
          categoryBudgets: previousBudget.categoryBudgets.map((cb) => ({
            ...cb,
            amount: Number(cb.amount),
          })),
        },
        templateMonth: previousBudget.month,
      };

      // Cache template response with shorter TTL since it might change when user creates a budget
      await redis.set(cacheKey, JSON.stringify(responseData), "EX", 30);

      return next(res.status(200).json({ status: "success", data: responseData }));
    }

    // 3. No budget at all — new user
    const responseData = {
      budgetStatus: "none" as const,
    };

    // Cache with short TTL — user will likely create one soon
    await redis.set(cacheKey, JSON.stringify(responseData), "EX", 30);

    return next(res.status(200).json({ status: "success", data: responseData }));
  } catch (error) {
    console.error("Get budget error:", error);
    return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
  }
};

export default getBudget;
