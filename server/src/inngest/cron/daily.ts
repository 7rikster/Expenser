import { inngest } from "../client";
import { prisma } from "../../lib";
import { cron } from "inngest";
import { getPreviousDay } from "../../utils/functions";

export const nightlyScheduler = inngest.createFunction(
  { id: "nightly-scheduler", triggers: [cron("15 0 * * *")] }, // Runs every night at 00:15 UTC (05:45 IST)
  async ({ step }) => {
    // 1. Calculate previous day
    const targetDate = getPreviousDay();
    const dateStr = targetDate.toISOString();

    // 2. Fetch all user IDs
    const users = await step.run("fetch-users", async () => {
      return prisma.user.findMany({
        select: { id: true },
      });
    });

    if (users.length === 0) {
      return { message: "No users found" };
    }

    // 3. Dispatch insights generation for all users
    const insightEvents = users.map((user) => ({
      name: "insights/generate" as const,
      data: {
        userId: user.id,
        date: dateStr,
      },
    }));

    await step.run("fan-out-insights", async () => {
      await inngest.send(insightEvents);
    });

    // 4. Dispatch monthly reviews (Without AI) for all users
    // Exception: Skip on the 1st of the month since the Monthly AI Review runs instead
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;

    if (!isFirstOfMonth) {
      const reviewEvents = users.map((user) => ({
        name: "review/monthly-no-ai" as const,
        data: {
          userId: user.id,
          date: dateStr,
        },
      }));

      await step.run("fan-out-reviews-no-ai", async () => {
        await inngest.send(reviewEvents);
      });
    }

    return {
      processedUsersCount: users.length,
      isFirstOfMonth,
      message: `Nightly events dispatched successfully.`,
    };
  }
);
