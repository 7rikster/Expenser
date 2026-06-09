import { prisma } from "../../lib";
import redis from "src/lib/redis";
const getMonthlyTrend = async (req, res, next) => {
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
        const cacheKey = `monthly-trend:${clerkUserId}:${new Date().toISOString().slice(0, 7)}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return next(res.status(200).json({ status: "success", data: JSON.parse(cached) }));
        }
        const now = new Date();
        const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
        const monthlyExpenses = await prisma.monthlyExpense.findMany({
            where: {
                userId: user.id,
                month: { gte: sixMonthsAgo },
            },
            select: {
                month: true,
                total: true,
            },
            orderBy: { month: "asc" },
        });
        const trend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
            const monthKey = d.toISOString().slice(0, 7);
            const found = monthlyExpenses.find((m) => new Date(m.month).toISOString().slice(0, 7) === monthKey);
            trend.push({
                month: d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
                total: found ? Number(found.total) : 0,
            });
        }
        await redis.set(cacheKey, JSON.stringify(trend), "EX", 600);
        return next(res.status(200).json({ status: "success", data: trend }));
    }
    catch (error) {
        console.error("Monthly trend error:", error);
        return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
    }
};
export default getMonthlyTrend;
