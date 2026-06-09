import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/index.js";
import { startOfDay, startOfMonth, getWeekStart, toLocalDateString, invalidateTransactionListCache } from "../../utils/functions.js";
import { Prisma as P } from "../../../generated/prisma/client";
import redis from "../../lib/redis.js";

const bulkCreate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    /* 1️⃣ Auth validation */
    const { userId: clerkUserId } = req.auth();

    if (!clerkUserId) {
      return next(
        res.status(401).json({
          status: "error",
          msg: "Unauthorized",
        })
      );
    }

    /* 2️⃣ Find User */
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!user) {
      return next(
        res.status(404).json({
          status: "error",
          msg: "User not found",
        })
      );
    }

    /* 3️⃣ Validate Body */
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return next(
        res.status(400).json({
          status: "error",
          msg: "A non-empty transactions array is required",
        })
      );
    }

    /* 4️⃣ Execute Batch Database Operations inside Transaction */
    const createdTransactions = await prisma.$transaction(async (tx) => {
      const records = [];
      let balanceChange = new P.Decimal(0);

      for (const item of transactions) {
        const { amount, category, description, merchantName, date, type } = item;

        if (!amount || !category || !type || (type !== "EXPENSE" && type !== "INCOME")) {
          throw new Error("Missing required transaction properties: amount, category, type");
        }

        const transAmount = new P.Decimal(amount);
        const transDate = date ? new Date(date) : new Date();
        const formattedDescription = merchantName && description 
          ? `${merchantName} - ${description}` 
          : merchantName || description || "AI Assistant Transaction";

        // Create transaction base record
        const newTrans = await tx.transaction.create({
          data: {
            type,
            amount: transAmount,
            category,
            description: formattedDescription,
            date: transDate,
            isRecurring: false,
            userId: user.id,
          },
        });
        records.push(newTrans);

        // If transaction is an EXPENSE, update the aggregate sheets
        if (type === "EXPENSE") {
          balanceChange = balanceChange.sub(transAmount);
          const day = startOfDay(transDate);
          const month = startOfMonth(transDate);

          // 4.1 Upsert Daily Total
          const dailyExpense = await tx.dailyExpense.upsert({
            where: {
              userId_date: {
                userId: user.id,
                date: day,
              },
            },
            update: {
              total: { increment: transAmount },
            },
            create: {
              userId: user.id,
              date: day,
              total: transAmount,
            },
          });

          // 4.2 Upsert Daily Item Category
          await tx.dailyExpenseItem.upsert({
            where: {
              dailyId_category: {
                dailyId: dailyExpense.id,
                category,
              },
            },
            update: {
              amount: { increment: transAmount },
            },
            create: {
              dailyId: dailyExpense.id,
              category,
              amount: transAmount,
            },
          });

          // 4.3 Upsert Monthly Total
          const monthlyExpense = await tx.monthlyExpense.upsert({
            where: {
              userId_month: {
                userId: user.id,
                month,
              },
            },
            update: {
              total: { increment: transAmount },
            },
            create: {
              userId: user.id,
              month,
              total: transAmount,
            },
          });

          // 4.4 Upsert Monthly Item Category
          await tx.monthlyExpenseItem.upsert({
            where: {
              monthId_category: {
                monthId: monthlyExpense.id,
                category,
              },
            },
            update: {
              amount: { increment: transAmount },
            },
            create: {
              monthId: monthlyExpense.id,
              category,
              amount: transAmount,
            },
          });
        } else if (type === "INCOME") {
          balanceChange = balanceChange.add(transAmount);
          const month = startOfMonth(transDate);

          // Upsert Monthly Income Total
          const monthlyIncome = await tx.monthlyIncome.upsert({
            where: {
              userId_month: {
                userId: user.id,
                month,
              },
            },
            update: {
              total: { increment: transAmount },
            },
            create: {
              userId: user.id,
              month,
              total: transAmount,
            },
          });

          // Upsert Monthly Income Item Category
          await tx.monthlyIncomeItem.upsert({
            where: {
              monthId_category: {
                monthId: monthlyIncome.id,
                category,
              },
            },
            update: {
              amount: { increment: transAmount },
            },
            create: {
              monthId: monthlyIncome.id,
              category,
              amount: transAmount,
            },
          });
        }
      }

      if (!balanceChange.isZero()) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: balanceChange },
          },
        });
      }

      return records;
    }, { timeout: 20000 }); // Generous timeout for multiple writes

    // Process unique dates to prevent redundant redis network calls
    const uniqueDates = Array.from(
      new Set(transactions.map((t: any) => toLocalDateString(new Date(t.date || Date.now()))))
    ).map(dStr => new Date(dStr)); // dStr is YYYY-MM-DD, new Date(dStr) parses as UTC midnight
     const currentTodayKey = toLocalDateString(new Date());
     await redis.del(`dashboard:${clerkUserId}:${currentTodayKey}`);

    for (const dateObj of uniqueDates) {
      const todayKey = toLocalDateString(dateObj);
      const monthKey = toLocalDateString(dateObj).slice(0, 7);
      const monthStart = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), 1));
      const weekStart = toLocalDateString(getWeekStart(dateObj));

      const dashboardCacheKey = `dashboard:${clerkUserId}:${todayKey}`;
      const monthlyTrendCacheKey = `monthly-trend:${clerkUserId}:${monthKey}`;
      const weeklyPatternCacheKey = `weekly-spending:${clerkUserId}:${weekStart}`;
      const categoryBreakdownCacheKey = `category-breakdown:${clerkUserId}:${monthStart.toISOString()}`;

      await redis.del(dashboardCacheKey);
      await redis.del(monthlyTrendCacheKey);
      await redis.del(weeklyPatternCacheKey);
      await redis.del(categoryBreakdownCacheKey);
    }
    
    await invalidateTransactionListCache(redis, clerkUserId);

    /* 6️⃣ Send Successful Response */
    return res.status(201).json({
      status: "success",
      msg: `${createdTransactions.length} transactions created successfully.`,
      data: createdTransactions,
    });

  } catch (error) {
    console.error("Bulk Create Transaction Controller Error:", error);
    return next(
      res.status(500).json({
        status: "error",
        msg: "Internal server error during transaction bulk creation",
      })
    );
  }
};

export default bulkCreate;