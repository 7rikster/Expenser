import { inngest } from "../client";
import { generateAndStoreMonthlyReviewWithAI } from "../../services/analytics/monthlyReviewWithAI";
export const processMonthlyReviewWithAI = inngest.createFunction({
    id: "process-monthly-review-ai",
    concurrency: 2,
    triggers: [{ event: "review/monthly-ai" }],
}, async ({ event, step }) => {
    const { userId, date } = event.data;
    const dateObj = new Date(date);
    await step.run("generate-review-ai", async () => {
        await generateAndStoreMonthlyReviewWithAI(userId, dateObj);
    });
    return { success: true, userId, date, ai: true };
});
