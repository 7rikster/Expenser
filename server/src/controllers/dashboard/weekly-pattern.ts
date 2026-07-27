import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";
import redis from "src/lib/redis";
import { toLocalDateString, getWeekEnd, getWeekStart } from "src/utils/functions";

/**
 * Formats a Date as YYYY-MM-DD using LOCAL date parts (not UTC).
 * This avoids timezone-related date shifts.
 */


const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * GET /dashboard/weekly-pattern?weekStart=YYYY-MM-DD
 * Returns day-wise expense totals for a specific calendar week (Mon-Sun).
 * Defaults to the current week if no weekStart param is provided.
 *
 * Response shape:
 * [
 *   { "date": "2026-05-12", "day": "Mon", "amount": 240 },
 *   { "date": "2026-05-13", "day": "Tue", "amount": 0 },
 *   ...
 * ]
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

    // Determine the week start date
    let weekStart: Date;
    const weekStartParam = req.query.weekStart as string | undefined;

    if (weekStartParam) {
      // Parse as UTC date to align with backend/database storage
      const [y, m, d] = weekStartParam.split("-").map(Number);
      const parsed = new Date(Date.UTC(y, m - 1, d));
      if (!isNaN(parsed.getTime())) {
        weekStart = getWeekStart(parsed);
      } else {
        weekStart = getWeekStart(new Date());
      }
    } else {
      weekStart = getWeekStart(new Date());
    }

    const weekEnd = getWeekEnd(weekStart);
    const weekStartKey = toLocalDateString(weekStart);

    // Check cache
    const cacheKey = `weekly-spending:${clerkUserId}:${weekStartKey}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return next(res.status(200).json({ status: "success", data: JSON.parse(cached) }));
    }

    // Fetch all expenses in the week range
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      select: {
        date: true,
        amount: true,
      },
    });

    // Build a map of date -> total amount (using local date strings)
    const dayTotals: Record<string, number> = {};
    transactions.forEach((t) => {
      const dateKey = toLocalDateString(new Date(t.date));
      dayTotals[dateKey] = (dayTotals[dateKey] || 0) + Number(t.amount);
    });

    // Build the 7-day response array (Mon-Sun)
    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      const dateKey = toLocalDateString(d);

      result.push({
        date: dateKey,
        day: DAY_LABELS[i],
        amount: Math.round((dayTotals[dateKey] || 0) * 100) / 100,
      });
    }

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);

    return next(res.status(200).json({ status: "success", data: result }));
  } catch (error) {
    console.error("Weekly pattern error:", error);
    return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
  }
};

export default getWeeklyPattern;
