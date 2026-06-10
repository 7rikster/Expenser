import { inngest } from "../client";
import { prisma } from "../../lib";
import {cron} from "inngest"
import { getPreviousDay } from "../../utils/functions";

export const monthlyScheduler = inngest.createFunction(
  { id: "monthly-scheduler", triggers: [cron("0 1 1 * *")] }, // Runs at 01:00 AM UTC on the 1st of every month (06:30 AM IST)
  async ({ step }) => {
    // 1. Calculate previous month target date
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

    // 3. Dispatch monthly review with AI events
    const reviewEvents = users.map((user) => ({
      name: "review/monthly-ai" as const,
      data: {
        userId: user.id,
        date: dateStr,
      },
    }));

    await step.run("fan-out-reviews-ai", async () => {
      await inngest.send(reviewEvents);
    });

    return {
      processedUsersCount: users.length,
      message: `Monthly AI review events dispatched successfully.`,
    };
  }
);
