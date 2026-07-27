import { inngest } from "../client";
import { generateAllInsights } from "../../services/analytics/insights";
export const processInsights = inngest.createFunction({
    id: "process-insights",
    concurrency: 5,
    triggers: [{
            event: "insights/generate"
        }]
}, async ({ event, step }) => {
    const { userId, date } = event.data;
    const dateObj = new Date(date);
    await step.run("generate-insights", async () => {
        await generateAllInsights(userId, dateObj);
    });
    return { success: true, userId, date };
});
