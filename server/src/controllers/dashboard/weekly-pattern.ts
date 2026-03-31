import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";
import redis from "src/lib/redis";

/**
 * GET /dashboard/weekly-pattern
 * Returns current month's expenses grouped by day-of-week for a bar chart.
 */
const getWeeklyPattern = async (
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

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const cacheKey = `weekly-pattern:${clerkUserId}:${now.toISOString().slice(0, 10)}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return next(res.status(200).json({ status: "success", data: JSON.parse(cached) }));
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: monthStart,
          lt: nextMonth,
        },
      },
      select: {
        date: true,
        amount: true,
      },
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayTotals: Record<string, number> = {};
    dayNames.forEach((d) => (dayTotals[d] = 0));

    transactions.forEach((t) => {
      const dayName = dayNames[new Date(t.date).getDay()];
      dayTotals[dayName] += Number(t.amount);
    });

    const pattern = dayNames.map((day) => ({
      day,
      total: Math.round(dayTotals[day] * 100) / 100,
    }));

    await redis.set(cacheKey, JSON.stringify(pattern), "EX", 300);

    return next(res.status(200).json({ status: "success", data: pattern }));
  } catch (error) {
    console.error("Weekly pattern error:", error);
    return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
  }
};

export default getWeeklyPattern;
