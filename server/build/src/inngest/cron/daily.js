import { inngest } from "../client";
import { prisma } from "../../lib";
import { cron } from "inngest";
import { getPreviousDay } from "../../utils/functions";
export const nightlyScheduler = inngest.createFunction({ id: "nightly-scheduler", triggers: [cron("15 0 * * *")] }, async ({ step }) => {
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
    const insightEvents = users.map((user) => ({
        name: "insights/generate",
        data: {
            userId: user.id,
            date: dateStr,
        },
    }));
    await step.run("fan-out-insights", async () => {
        await inngest.send(insightEvents);
    });
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;
    if (!isFirstOfMonth) {
        const reviewEvents = users.map((user) => ({
            name: "review/monthly-no-ai",
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
});
