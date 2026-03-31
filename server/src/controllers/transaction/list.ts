import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";

/**
 * GET /transaction/list
 * Paginated transaction list with optional filters:
 *   ?month=2026-03&category=food&page=1&limit=10&type=EXPENSE
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

    // Build filter conditions
    const where: any = { userId: user.id };

    // Month filter: ?month=2026-03
    if (req.query.month) {
      const [year, month] = (req.query.month as string).split("-").map(Number);
      where.date = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }

    // Category filter
    if (req.query.category) {
      where.category = req.query.category as string;
    }

    // Type filter
    if (req.query.type && (req.query.type === "EXPENSE" || req.query.type === "INCOME")) {
      where.type = req.query.type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: "desc" },
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

    return next(
      res.status(200).json({
        status: "success",
        data: {
          transactions: serialized,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      })
    );
  } catch (error) {
    console.error("Transaction list error:", error);
    return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
  }
};

export default list;
