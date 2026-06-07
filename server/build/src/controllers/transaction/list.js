import { prisma } from "../../lib";
import redis from "src/lib/redis";
const CACHE_TTL = 300;
const list = async (req, res, next) => {
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
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const month = req.query.month || "";
        const category = req.query.category || "";
        const type = req.query.type || "";
        const search = req.query.search || "";
        const sort = req.query.sort || "latest";
        const cacheKey = `txn-list:${clerkUserId}:${month}:${category}:${type}:${search}:${sort}:${page}:${limit}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return next(res.status(200).json({
                status: "success returned from Redis cache",
                data: JSON.parse(cached),
            }));
        }
        const where = { userId: user.id };
        if (month) {
            const [y, m] = month.split("-").map(Number);
            where.date = {
                gte: new Date(y, m - 1, 1),
                lt: new Date(y, m, 1),
            };
        }
        if (category) {
            where.category = category;
        }
        if (type && (type === "EXPENSE" || type === "INCOME")) {
            where.type = type;
        }
        if (search) {
            where.description = {
                contains: search,
                mode: "insensitive",
            };
        }
        let orderBy = { date: "desc" };
        if (sort === "oldest")
            orderBy = { date: "asc" };
        else if (sort === "highest")
            orderBy = { amount: "desc" };
        else if (sort === "lowest")
            orderBy = { amount: "asc" };
        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    description: true,
                    date: true,
                    category: true,
                    isRecurring: true,
                    recurringInterval: true,
                    status: true,
                    createdAt: true,
                },
            }),
            prisma.transaction.count({ where }),
        ]);
        const serialized = transactions.map((t) => ({
            ...t,
            amount: Number(t.amount),
        }));
        const responseData = {
            transactions: serialized,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
        await redis.set(cacheKey, JSON.stringify(responseData), "EX", CACHE_TTL);
        return next(res.status(200).json({
            status: "success, Fetched from DB",
            data: responseData,
        }));
    }
    catch (error) {
        console.error("Transaction list error:", error);
        return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
    }
};
export default list;
