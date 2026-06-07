import { prisma } from "../../lib";
import { getThisMonthExpense } from "src/utils/transaction";
import redis from "src/lib/redis";
const getCategoryBreakdown = async (req, res, next) => {
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
        let targetDate = new Date();
        const monthParam = req.query.month;
        if (monthParam) {
            const [year, month] = monthParam.split("-").map(Number);
            if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
                targetDate = new Date(year, month - 1, 1);
            }
        }
        const cacheKey = `category-breakdown:${clerkUserId}:${targetDate}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return next(res.status(200).json({ status: "success", data: JSON.parse(cached) }));
        }
        const expenseData = await getThisMonthExpense(user.id, targetDate);
        await redis.set(cacheKey, JSON.stringify(expenseData), "EX", 300);
        return next(res.status(200).json({
            status: "success",
            data: expenseData,
        }));
    }
    catch (error) {
        console.error("Category breakdown error:", error);
        return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
    }
};
export default getCategoryBreakdown;
