import { prisma } from "../../lib";
import redis from "src/lib/redis";
import { toLocalDateString, getWeekEnd, getWeekStart } from "src/utils/functions";
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const getWeeklyPattern = async (req, res, next) => {
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
        let weekStart;
        const weekStartParam = req.query.weekStart;
        if (weekStartParam) {
            const [y, m, d] = weekStartParam.split("-").map(Number);
            const parsed = new Date(Date.UTC(y, m - 1, d));
            if (!isNaN(parsed.getTime())) {
                weekStart = getWeekStart(parsed);
            }
            else {
                weekStart = getWeekStart(new Date());
            }
        }
        else {
            weekStart = getWeekStart(new Date());
        }
        const weekEnd = getWeekEnd(weekStart);
        const weekStartKey = toLocalDateString(weekStart);
        const cacheKey = `weekly-spending:${clerkUserId}:${weekStartKey}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return next(res.status(200).json({ status: "success", data: JSON.parse(cached) }));
        }
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
        const dayTotals = {};
        transactions.forEach((t) => {
            const dateKey = toLocalDateString(new Date(t.date));
            dayTotals[dateKey] = (dayTotals[dateKey] || 0) + Number(t.amount);
        });
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
        await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
        return next(res.status(200).json({ status: "success", data: result }));
    }
    catch (error) {
        console.error("Weekly pattern error:", error);
        return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
    }
};
export default getWeeklyPattern;
