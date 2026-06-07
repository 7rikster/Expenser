import { prisma } from "../../lib";
import redis from "src/lib/redis";
const updateBudget = async (req, res, next) => {
    try {
        const { userId: clerkUserId } = req.auth();
        if (!clerkUserId) {
            return next(res.status(401).json({ status: "error", msg: "Unauthorized" }));
        }
        const { dailyBudget, monthlyBudget } = req.body;
        if (dailyBudget === undefined && monthlyBudget === undefined) {
            return next(res.status(400).json({ status: "error", msg: "At least one budget field is required" }));
        }
        const data = {};
        if (dailyBudget !== undefined)
            data.dailyBudget = dailyBudget;
        if (monthlyBudget !== undefined)
            data.monthlyBudget = monthlyBudget;
        const user = await prisma.user.update({
            where: { clerkUserId },
            data,
            select: {
                id: true,
                dailyBudget: true,
                monthlyBudget: true,
            },
        });
        const todayKey = new Date().toISOString().slice(0, 10);
        await redis.del(`dashboard:${clerkUserId}:${todayKey}`);
        return next(res.status(200).json({
            status: "success",
            data: {
                dailyBudget: Number(user.dailyBudget),
                monthlyBudget: Number(user.monthlyBudget),
            },
        }));
    }
    catch (error) {
        console.error("Update budget error:", error);
        return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
    }
};
export default updateBudget;
