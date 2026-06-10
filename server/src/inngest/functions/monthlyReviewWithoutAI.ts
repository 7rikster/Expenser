import { inngest } from "../client";
import { generateAndStoreMonthlyReviewWithoutAI } from "../../services/analytics/monthlyReviewWithoutAI";

export const processMonthlyReviewWithoutAI = inngest.createFunction(
  {
    id: "process-monthly-review-no-ai",
    concurrency: 5,
    triggers: [{ event: "review/monthly-no-ai" }],
  },
  async ({ event, step }) => {
    const { userId, date } = event.data;
    const dateObj = new Date(date);

    await step.run("generate-review-no-ai", async () => {
      await generateAndStoreMonthlyReviewWithoutAI(userId, dateObj);
    });

    return { success: true, userId, date, ai: false };
  }
);
