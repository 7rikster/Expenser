import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/index.js";
import { startOfMonth } from "../../utils/functions.js";
import redis from "../../lib/redis.js";

/**
 * PATCH /budget/dismiss-warning
 * Dismisses the budget warning for a given month or specific budget ID.
 */
const dismissWarning = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId: clerkUserId } = req.auth();
    if (!clerkUserId) {
      return next(res.status(401).json({ status: "error", msg: "Unauthorized" }));
    }

    const { month, budgetId } = req.body;

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return next(res.status(404).json({ status: "error", msg: "User not found" }));
    }

    let targetBudget;
    if (budgetId) {
      targetBudget = await prisma.userBudget.findUnique({
        where: { id: budgetId },
      });
    } else {
      const targetDate = month ? new Date(month) : new Date();
      const targetMonth = startOfMonth(targetDate);

      targetBudget = await prisma.userBudget.findUnique({
        where: {
          userId_month: {
            userId: user.id,
            month: targetMonth,
          },
        },
      });
    }

    if (!targetBudget) {
      return next(
        res.status(404).json({ status: "error", msg: "Budget not found" })
      );
    }

    if (targetBudget.userId !== user.id) {
      return next(res.status(403).json({ status: "error", msg: "Forbidden" }));
    }

    const updatedBudget = await prisma.userBudget.update({
      where: { id: targetBudget.id },
      data: { warningDismissed: true },
    });

    // Clear budget cache for this month
    const cacheKey = `budget:${clerkUserId}:${updatedBudget.month.toISOString()}`;
    await redis.del(cacheKey);

    return next(
      res.status(200).json({
        status: "success",
        msg: "Warning dismissed successfully",
        data: {
          id: updatedBudget.id,
          month: updatedBudget.month,
          warningDismissed: updatedBudget.warningDismissed,
        },
      })
    );
  } catch (error) {
    console.error("Dismiss warning error:", error);
    return next(
      res.status(500).json({ status: "error", msg: "Internal server error" })
    );
  }
};

export default dismissWarning;
