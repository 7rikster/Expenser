import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib";
import { startOfDay, startOfMonth } from "src/utils/functions";
import { Prisma as P } from "../../../generated/prisma/client";
import redis from "src/lib/redis";

/**
 * PUT /transaction/:id
 * Update a transaction's description, amount, and/or category.
 * When amount or category change on an EXPENSE, performs an optimized
 * aggregate rollback (undo old values) + reapply (apply new values)
 * on daily/monthly aggregates using prefetching and parallel ops.
 */
const updateTransaction = async (
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

    /* ── 2. Fetch existing transaction ───────────────────────── */
    const id = req.params.id as string;
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return next(res.status(404).json({ status: "error", msg: "Transaction not found" }));
    }

    /* ── 3. Determine what changed ───────────────────────────── */
    const { description, amount, category } = req.body;

    const oldAmount = new P.Decimal(existing.amount.toString());
    const newAmount = amount !== undefined ? new P.Decimal(amount) : oldAmount;
    const oldCategory = existing.category;
    const newCategory = category !== undefined ? category : oldCategory;

    const amountChanged = !oldAmount.eq(newAmount);
    const categoryChanged = oldCategory !== newCategory;
    const needsAggregateUpdate = existing.type === "EXPENSE" && (amountChanged || categoryChanged);

    /* ── 4. Simple update (no aggregate impact) ──────────────── */
    if (!needsAggregateUpdate) {
      const updated = await prisma.transaction.update({
        where: { id },
        data: {
          ...(description !== undefined && { description }),
          ...(amount !== undefined && { amount: newAmount }),
          ...(category !== undefined && { category: newCategory }),
        },
      });

      const todayKey = new Date().toISOString().slice(0, 10);
      await redis.del(`dashboard:${clerkUserId}:${todayKey}`);

      return next(
        res.status(200).json({
          status: "success",
          data: { ...updated, amount: Number(updated.amount) },
        })
      );
    }

    /* ── 5. Prefetch aggregate records in parallel (2 DB calls) ── */
    const day = startOfDay(existing.date);
    const month = startOfMonth(existing.date);

    const [dailyExpense, monthlyExpense] = await Promise.all([
      prisma.dailyExpense.findUnique({
        where: { userId_date: { userId: user.id, date: day } },
        include: { expenseItems: true },
      }),
      prisma.monthlyExpense.findUnique({
        where: { userId_month: { userId: user.id, month } },
        include: { expenseItems: true },
      }),
    ]);

    /* ── 6. Atomic transaction: update + rollback + reapply ─── */
    const updated = await prisma.$transaction(
      async (tx) => {
        // 6.1 Update the transaction itself
        const updatedTxn = await tx.transaction.update({
          where: { id },
          data: {
            ...(description !== undefined && { description }),
            amount: newAmount,
            category: newCategory,
          },
        });

        const ops: Promise<unknown>[] = [];

        // ── 6.2 Daily aggregate rollback + reapply ──────────
        if (dailyExpense) {
          const netTotalChange = newAmount.sub(oldAmount); // positive = increase, negative = decrease
          const newDailyTotal = dailyExpense.total.add(netTotalChange);

          if (newDailyTotal.lte(0)) {
            // Entire day zeroed out → cascade-delete removes items
            ops.push(tx.dailyExpense.delete({ where: { id: dailyExpense.id } }));
          } else {
            // Update daily total
            ops.push(
              tx.dailyExpense.update({
                where: { id: dailyExpense.id },
                data: { total: newDailyTotal },
              })
            );

            const dailyItemsByCategory = new Map(
              dailyExpense.expenseItems.map((item) => [item.category, item])
            );

            if (categoryChanged) {
              // ── Rollback: decrement old amount from OLD category item
              const oldItem = dailyItemsByCategory.get(oldCategory);
              if (oldItem) {
                const oldItemNewTotal = oldItem.amount.sub(oldAmount);
                if (oldItemNewTotal.lte(0)) {
                  ops.push(tx.dailyExpenseItem.delete({ where: { id: oldItem.id } }));
                } else {
                  ops.push(
                    tx.dailyExpenseItem.update({
                      where: { id: oldItem.id },
                      data: { amount: oldItemNewTotal },
                    })
                  );
                }
              }

              // ── Reapply: increment new amount to NEW category item (upsert)
              ops.push(
                tx.dailyExpenseItem.upsert({
                  where: {
                    dailyId_category: {
                      dailyId: dailyExpense.id,
                      category: newCategory,
                    },
                  },
                  update: { amount: { increment: newAmount } },
                  create: {
                    dailyId: dailyExpense.id,
                    category: newCategory,
                    amount: newAmount,
                  },
                })
              );
            } else {
              // Same category — just adjust by the difference
              const item = dailyItemsByCategory.get(oldCategory);
              if (item) {
                const itemNewTotal = item.amount.add(netTotalChange);
                if (itemNewTotal.lte(0)) {
                  ops.push(tx.dailyExpenseItem.delete({ where: { id: item.id } }));
                } else {
                  ops.push(
                    tx.dailyExpenseItem.update({
                      where: { id: item.id },
                      data: { amount: itemNewTotal },
                    })
                  );
                }
              }
            }
          }
        }

        // ── 6.3 Monthly aggregate rollback + reapply ────────
        if (monthlyExpense) {
          const netTotalChange = newAmount.sub(oldAmount);
          const newMonthlyTotal = monthlyExpense.total.add(netTotalChange);

          if (newMonthlyTotal.lte(0)) {
            ops.push(tx.monthlyExpense.delete({ where: { id: monthlyExpense.id } }));
          } else {
            ops.push(
              tx.monthlyExpense.update({
                where: { id: monthlyExpense.id },
                data: { total: newMonthlyTotal },
              })
            );

            const monthlyItemsByCategory = new Map(
              monthlyExpense.expenseItems.map((item) => [item.category, item])
            );

            if (categoryChanged) {
              // ── Rollback old category
              const oldItem = monthlyItemsByCategory.get(oldCategory);
              if (oldItem) {
                const oldItemNewTotal = oldItem.amount.sub(oldAmount);
                if (oldItemNewTotal.lte(0)) {
                  ops.push(tx.monthlyExpenseItem.delete({ where: { id: oldItem.id } }));
                } else {
                  ops.push(
                    tx.monthlyExpenseItem.update({
                      where: { id: oldItem.id },
                      data: { amount: oldItemNewTotal },
                    })
                  );
                }
              }

              // ── Reapply new category (upsert)
              ops.push(
                tx.monthlyExpenseItem.upsert({
                  where: {
                    monthId_category: {
                      monthId: monthlyExpense.id,
                      category: newCategory,
                    },
                  },
                  update: { amount: { increment: newAmount } },
                  create: {
                    monthId: monthlyExpense.id,
                    category: newCategory,
                    amount: newAmount,
                  },
                })
              );
            } else {
              // Same category — adjust by difference
              const item = monthlyItemsByCategory.get(oldCategory);
              if (item) {
                const itemNewTotal = item.amount.add(netTotalChange);
                if (itemNewTotal.lte(0)) {
                  ops.push(tx.monthlyExpenseItem.delete({ where: { id: item.id } }));
                } else {
                  ops.push(
                    tx.monthlyExpenseItem.update({
                      where: { id: item.id },
                      data: { amount: itemNewTotal },
                    })
                  );
                }
              }
            }
          }
        }

        // Fire all aggregate ops in parallel
        await Promise.all(ops);

        return updatedTxn;
      },
      { timeout: 15000 }
    );

    /* ── 7. Clear cache ──────────────────────────────────────── */
    const todayKey = new Date().toISOString().slice(0, 10);
    await redis.del(`dashboard:${clerkUserId}:${todayKey}`);

    return next(
      res.status(200).json({
        status: "success",
        data: { ...updated, amount: Number(updated.amount) },
      })
    );
  } catch (error) {
    console.error("Update transaction error:", error);
    return next(res.status(500).json({ status: "error", msg: "Internal server error" }));
  }
};

export default updateTransaction;
