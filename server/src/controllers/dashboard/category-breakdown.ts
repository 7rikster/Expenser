import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";
import { getThisMonthExpense } from "src/utils/transaction";
import redis from "src/lib/redis";

/**
 * GET /dashboard/category-breakdown?month=YYYY-MM
 * Returns category-wise expense breakdown for the specified month.
 * Defaults to the current month if no month query param is provided.
 */
const getCategoryBreakdown = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    // Parse the month query param (YYYY-MM) or default to current month
    const now = new Date();
    let targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthParam = req.query.month as string | undefined;

    if (monthParam) {
      const [year, month] = monthParam.split("-").map(Number);
      if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
        targetDate = new Date(Date.UTC(year, month - 1, 1));
      }
    }

    const cacheKey = `category-breakdown:${clerkUserId}:${targetDate.toISOString()}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return next(res.status(200).json({ status: "success", data: JSON.parse(cached) }));
    }

    const expenseData = await getThisMonthExpense(user.id, targetDate);
    await redis.set(cacheKey, JSON.stringify(expenseData), "EX", 300);

    return next(
      res.status(200).json({
        status: "success",
        data: expenseData,
      })
    );
  } catch (error) {
    console.error("Category breakdown error:", error);
    return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
  }
};

export default getCategoryBreakdown;
