import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";
import redis from "src/lib/redis";

const CACHE_TTL = 300; // 5 minutes

/**
 * GET /transaction/list
 * Paginated transaction list with optional filters:
 *   ?month=2026-03&category=food&page=1&limit=10&type=EXPENSE&search=coffee&sort=latest
 *
 * Results are cached in Redis keyed by user + filter combination.
 */
const list = async (req: Request, res: Response, next: NextFunction) => {
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

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;
    const month = (req.query.month as string) || "";
    const category = (req.query.category as string) || "";
    const type = (req.query.type as string) || "";
    const search = (req.query.search as string) || "";
    const sort = (req.query.sort as string) || "latest";

    // ── Check Redis cache ────────────────────────────────────
    const cacheKey = `txn-list:${clerkUserId}:${month}:${category}:${type}:${search}:${sort}:${page}:${limit}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return next(
        res.status(200).json({
          status: "success returned from Redis cache",
          data: JSON.parse(cached),
        })
      );
    }

    // ── Build filter conditions ──────────────────────────────
    const where: any = { userId: user.id };

    // Month filter: ?month=2026-03
    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = {
        gte: new Date(Date.UTC(y, m - 1, 1)),
        lt: new Date(Date.UTC(y, m, 1)),
      };
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Type filter
    if (type && (type === "EXPENSE" || type === "INCOME")) {
      where.type = type;
    }

    // Search filter
    if (search) {
      where.description = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Sort
    let orderBy: any = { date: "desc" };
    if (sort === "oldest") orderBy = { date: "asc" };
    else if (sort === "highest") orderBy = { amount: "desc" };
    else if (sort === "lowest") orderBy = { amount: "asc" };

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

    // ── Store in Redis cache ─────────────────────────────────
    await redis.set(cacheKey, JSON.stringify(responseData), "EX", CACHE_TTL);

    return next(
      res.status(200).json({
        status: "success, Fetched from DB",
        data: responseData,
      })
    );
  } catch (error) {
    console.error("Transaction list error:", error);
    return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
  }
};

export default list;
