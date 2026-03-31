import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";
import { getDayExpense, getThisMonthExpense } from "src/utils/transaction";
import redis from "src/lib/redis";
import { startOfMonth } from "src/utils/functions";

/**
 * GET /dashboard
 * Primary dashboard data endpoint.
 * Returns user profile, today/month expenses, transaction count, last month comparison.
 */
const getDashboardData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId: clerkUserId } = req.auth();
    if (!clerkUserId) {
      return next(res.status(401).json({ status: "error", msg: "Unauthorized" }));
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const cacheKey = `dashboard:${clerkUserId}:${todayKey}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return next(res.status(200).json({ status: "success", data: JSON.parse(cachedData) }));
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        name: true,
        email: true,
        dailyBudget: true,
        monthlyBudget: true,
      },
    });

    if (!user) {
      return next(res.status(404).json({ status: "error", msg: "User not found" }));
    }

    // Last month data for comparison
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Transaction count for current month
    const currentMonthStart = startOfMonth(now);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [todayExpense, thisMonthExpense, lastMonthExpense, transactionCount] = await Promise.all([
      getDayExpense(user.id),
      getThisMonthExpense(user.id),
      getThisMonthExpense(user.id, lastMonthDate),
      prisma.transaction.count({
        where: {
          userId: user.id,
          date: {
            gte: currentMonthStart,
            lt: nextMonthStart,
          },
        },
      })
    ]);

    const dashboardData = {
      user,
      todayExpense,
      thisMonthExpense,
      lastMonthExpense,
      transactionCount,
    };

    await redis.set(cacheKey, JSON.stringify(dashboardData), "EX", 300);

    return next(res.status(200).json({ status: "success", data: dashboardData }));
  } catch (error) {
    console.error("Dashboard data error:", error);
    return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
  }
};

export default getDashboardData;
