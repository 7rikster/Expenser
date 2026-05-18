import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";
import { startOfDay, startOfMonth } from "src/utils/functions";
import { Prisma as P } from "../../../generated/prisma/client";
import redis from "src/lib/redis";

/**
 * DELETE /transaction/bulk
 * Bulk-deletes transactions and rolls back daily/monthly aggregates.
 * Body: { ids: string[] }
 *
 * Optimization strategy:
 *  1. Prefetch ALL targeted transactions in one query.
 *  2. Group EXPENSE transactions by day+category and month+category using Maps.
 *  3. Prefetch ALL affected daily/monthly aggregate records in bulk.
 *  4. Compute net decrements per aggregate, then batch update/delete inside
 *     a single Prisma interactive transaction — minimising round-trips.
 */
const deleteTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    /* ── 1. Auth ─────────────────────────────────────────────── */
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

    /* ── 2. Validate body ────────────────────────────────────── */
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return next(
        res.status(400).json({ status: "error", msg: "ids must be a non-empty array" })
      );
    }    /* ── 3. Prefetch all targeted transactions (1 DB call) ─── */
    const transactions = await prisma.transaction.findMany({
      where: { id: { in: ids }, userId: user.id },
    });

    if (transactions.length === 0) {
      return next(
        res.status(404).json({ status: "error", msg: "No matching transactions found" })
      );
    }

    /* ── 4. Build aggregation maps for EXPENSE txns ────────── */
    // dayMap:   dayKey -> { totalDecrement, categories: Map<category, decrement> }
    // monthMap: monthKey -> { totalDecrement, categories: Map<category, decrement> }
    const dayMap = new Map<string, { day: Date; totalDecrement: P.Decimal; categories: Map<string, P.Decimal> }>();
    const monthMap = new Map<string, { month: Date; totalDecrement: P.Decimal; categories: Map<string, P.Decimal> }>();

    for (const txn of transactions) {
      if (txn.type !== "EXPENSE") continue;

      const amount = new P.Decimal(txn.amount.toString());
      const day = startOfDay(txn.date);
      const month = startOfMonth(txn.date);
      const dayKey = day.toISOString();
      const monthKey = month.toISOString();

      // ── Daily accumulation
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { day, totalDecrement: new P.Decimal(0), categories: new Map() });
      }
      const dayEntry = dayMap.get(dayKey)!;
      dayEntry.totalDecrement = dayEntry.totalDecrement.add(amount);
      dayEntry.categories.set(
        txn.category,
        (dayEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount)
      );

      // ── Monthly accumulation
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month, totalDecrement: new P.Decimal(0), categories: new Map() });
      }
      const monthEntry = monthMap.get(monthKey)!;
      monthEntry.totalDecrement = monthEntry.totalDecrement.add(amount);
      monthEntry.categories.set(
        txn.category,
        (monthEntry.categories.get(txn.category) ?? new P.Decimal(0)).add(amount)
      );
    }

    /* ── 5. Prisma interactive transaction ─────────────────── */
    await prisma.$transaction(
      async (tx) => {
        // 5.1  Bulk-delete all transactions (1 DB call)
        await tx.transaction.deleteMany({ where: { id: { in: ids }, userId: user.id } });

        // 5.2  Roll back daily aggregates
        if (dayMap.size > 0) {
          // Prefetch all affected DailyExpense rows (1 DB call)
          const dayDates = [...dayMap.values()].map((d) => d.day);
          const dailyExpenses = await tx.dailyExpense.findMany({
            where: { userId: user.id, date: { in: dayDates } },
            include: { expenseItems: true },
          });

          // Index by date ISO for O(1) lookup
          const dailyByDate = new Map(dailyExpenses.map((de) => [de.date.toISOString(), de]));

          const dailyOps: Promise<unknown>[] = [];

          for (const [dayKey, { totalDecrement, categories }] of dayMap) {
            const daily = dailyByDate.get(dayKey);
            if (!daily) continue;

            const newTotal = daily.total.sub(totalDecrement);

            if (newTotal.lte(0)) {
              // Cascade-delete removes items automatically
              dailyOps.push(tx.dailyExpense.delete({ where: { id: daily.id } }));
            } else {
              // Decrement total
              dailyOps.push(
                tx.dailyExpense.update({
                  where: { id: daily.id },
                  data: { total: { decrement: totalDecrement } },
                })
              );

              // Handle category items using prefetched expenseItems
              const itemsByCategory = new Map(daily.expenseItems.map((item) => [item.category, item]));

              for (const [category, catDecrement] of categories) {
                const item = itemsByCategory.get(category);
                if (!item) continue;

                const newItemTotal = item.amount.sub(catDecrement);
                if (newItemTotal.lte(0)) {
                  dailyOps.push(tx.dailyExpenseItem.delete({ where: { id: item.id } }));
                } else {
                  dailyOps.push(
                    tx.dailyExpenseItem.update({
                      where: { id: item.id },
                      data: { amount: { decrement: catDecrement } },
                    })
                  );
                }
              }
            }
          }

          await Promise.all(dailyOps);
        }

        // 5.3  Roll back monthly aggregates
        if (monthMap.size > 0) {
          // Prefetch all affected MonthlyExpense rows (1 DB call)
          const monthDates = [...monthMap.values()].map((m) => m.month);
          const monthlyExpenses = await tx.monthlyExpense.findMany({
            where: { userId: user.id, month: { in: monthDates } },
            include: { expenseItems: true },
          });

          const monthlyByMonth = new Map(monthlyExpenses.map((me) => [me.month.toISOString(), me]));

          const monthlyOps: Promise<unknown>[] = [];

          for (const [monthKey, { totalDecrement, categories }] of monthMap) {
            const monthly = monthlyByMonth.get(monthKey);
            if (!monthly) continue;

            const newTotal = monthly.total.sub(totalDecrement);

            if (newTotal.lte(0)) {
              monthlyOps.push(tx.monthlyExpense.delete({ where: { id: monthly.id } }));
            } else {
              monthlyOps.push(
                tx.monthlyExpense.update({
                  where: { id: monthly.id },
                  data: { total: { decrement: totalDecrement } },
                })
              );

              const itemsByCategory = new Map(monthly.expenseItems.map((item) => [item.category, item]));

              for (const [category, catDecrement] of categories) {
                const item = itemsByCategory.get(category);
                if (!item) continue;

                const newItemTotal = item.amount.sub(catDecrement);
                if (newItemTotal.lte(0)) {
                  monthlyOps.push(tx.monthlyExpenseItem.delete({ where: { id: item.id } }));
                } else {
                  monthlyOps.push(
                    tx.monthlyExpenseItem.update({
                      where: { id: item.id },
                      data: { amount: { decrement: catDecrement } },
                    })
                  );
                }
              }
            }
          }

          await Promise.all(monthlyOps);
        }
      },
      { timeout: 30000 }
    );

    /* ── 6. Clear cache ──────────────────────────────────────── */
    const todayKey = new Date().toISOString().slice(0, 10);
    const monthlyTrendCacheKey = `monthly-trend:${clerkUserId}:${new Date().toISOString().slice(0, 7)}`;
    await redis.del(`dashboard:${clerkUserId}:${todayKey}`);
    await redis.del(monthlyTrendCacheKey);
    let cursor = "0";
    const pattern = `weekly-spending:${clerkUserId}:*`;
    do {
      const result = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );

      cursor = result[0];

      const keys = result[1];

      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");

    let cursor1 = "0";
    const pattern1 = `category-breakdown:${clerkUserId}:*`;
    do {
      const result = await redis.scan(
        cursor1,
        "MATCH",
        pattern1,
        "COUNT",
        100
      );

      cursor1 = result[0];

      const keys = result[1];

      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor1 !== "0");

    return next(
      res.status(200).json({
        status: "success",
        msg: `${transactions.length} transaction(s) deleted`,
        deletedCount: transactions.length,
      })
    );
  } catch (error) {
    console.error("Bulk delete transaction error:", error);
    return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
  }
};

export default deleteTransaction;
