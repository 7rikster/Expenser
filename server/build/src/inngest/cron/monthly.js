import { inngest } from "../client";
import { prisma } from "../../lib";
import { cron } from "inngest";
import { getPreviousDay } from "../../utils/functions";
export const monthlyScheduler = inngest.createFunction({ id: "monthly-scheduler", triggers: [cron("0 1 1 * *")] }, async ({ step }) => {
    const targetDate = getPreviousDay();
    const dateStr = targetDate.toISOString();
    const users = await step.run("fetch-users", async () => {
        return prisma.user.findMany({
            select: { id: true },
        });
    });
    if (users.length === 0) {
        return { message: "No users found" };
    }
    const reviewEvents = users.map((user) => ({
        name: "review/monthly-ai",
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
});
