import { prisma } from "../../lib";
import { getDayExpense, getThisMonthExpense, getThisMonthIncome } from "src/utils/transaction";
import redis from "src/lib/redis";
import { startOfMonth } from "src/utils/functions";
const getDashboardData = async (req, res, next) => {
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
                balance: true,
            },
        });
        if (!user) {
            return next(res.status(404).json({ status: "error", msg: "User not found" }));
        }
        const now = new Date();
        const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const currentMonthStart = startOfMonth(now);
        const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        const [todayExpense, thisMonthExpense, lastMonthExpense, transactionCount, thisMonthIncome] = await Promise.all([
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
            }),
            getThisMonthIncome(user.id)
        ]);
        const dashboardData = {
            user,
            todayExpense,
            thisMonthExpense,
            lastMonthExpense,
            transactionCount,
            thisMonthIncome,
        };
        await redis.set(cacheKey, JSON.stringify(dashboardData), "EX", 300);
        return next(res.status(200).json({ status: "success", data: dashboardData }));
    }
    catch (error) {
        console.error("Dashboard data error:", error);
        return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
    }
};
export default getDashboardData;
