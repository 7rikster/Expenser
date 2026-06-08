import { AssistantActionContext } from "../types";
import { prisma } from "../../../lib";
import { Prisma as P } from "../../../../generated/prisma/client";
import redis from "src/lib/redis";
import {
  getWeekStart,
  invalidateTransactionListCache,
  startOfDay,
  startOfMonth,
  toLocalDateString,
} from "src/utils/functions";

export const ApproveDrafts = async ({
  userId,
  data,
  clerkUserId,
}: AssistantActionContext) => {
  if (data.draftTransactions && data.draftTransactions.length > 0) {
    const createdTransactions = await prisma.$transaction(
      async (tx) => {
        const records = [];
        let balanceChange = new P.Decimal(0);

        for (const item of data.draftTransactions) {
          const { amount, category, description, merchantName, date, type } =
            item;

          if (
            !amount ||
            !category ||
            !type ||
            (type !== "EXPENSE" && type !== "INCOME")
          ) {
            throw new Error(
              "Missing required transaction properties: amount, category, type"
            );
          }

          const transAmount = new P.Decimal(amount);
          const transDate = date ? new Date(date) : new Date();
          const formattedDescription =
            merchantName && description
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
              userId: userId,
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
                  userId: userId,
                  date: day,
                },
              },
              update: {
                total: { increment: transAmount },
              },
              create: {
                userId: userId,
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
                  userId: userId,
                  month,
                },
              },
              update: {
                total: { increment: transAmount },
              },
              create: {
                userId: userId,
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
                  userId: userId,
                  month,
                },
              },
              update: {
                total: { increment: transAmount },
              },
              create: {
                userId: userId,
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
            where: { id: userId },
            data: {
              balance: { increment: balanceChange },
            },
          });
        }

        return records;
      },
      { timeout: 20000 }
    ); // Generous timeout for multiple writes

    /* 5️⃣ Invalidate Redis Cache Keys */
    // Process unique dates to prevent redundant redis network calls
    const uniqueDates = Array.from(
      new Set<string>(
        data.draftTransactions.map((t: any) =>
          new Date(t.date || Date.now()).toDateString()
        )
      )
    ).map((dStr: string) => new Date(dStr));
    const currentTodayKey = new Date().toISOString().slice(0, 10);
    await redis.del(`dashboard:${clerkUserId}:${currentTodayKey}`);

    for (const dateObj of uniqueDates) {
      const todayKey = dateObj.toISOString().slice(0, 10);
      const monthKey = dateObj.toISOString().slice(0, 7);
      const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      const weekStart = toLocalDateString(getWeekStart(dateObj));

      const dashboardCacheKey = `dashboard:${clerkUserId}:${todayKey}`;
      const monthlyTrendCacheKey = `monthly-trend:${clerkUserId}:${monthKey}`;
      const weeklyPatternCacheKey = `weekly-spending:${clerkUserId}:${weekStart}`;
      const categoryBreakdownCacheKey = `category-breakdown:${clerkUserId}:${monthStart}`;

      await redis.del(dashboardCacheKey);
      await redis.del(monthlyTrendCacheKey);
      await redis.del(weeklyPatternCacheKey);
      await redis.del(categoryBreakdownCacheKey);
    }

    await invalidateTransactionListCache(redis, clerkUserId);
    data.replyText = `Successfully approved! I've logged the ${createdTransactions.length} ${createdTransactions.length === 1 ? "transaction" : "transactions"} to your database.`;
    data.draftTransactions = []; // empty out drafts
    return {
      status: "success",
      msg: "Approved",
      action: "APPROVE_DRAFTS",
      transactions: [],
      replyText: data.replyText,
    };
  } else {
    return {
      status: "Failed",
      msg: "No draft transactions to approve",
      action: "GENERAL",
      transactions: [],
      replyText: "I couldn't find any draft transactions to approve.",
    };
  }
};
