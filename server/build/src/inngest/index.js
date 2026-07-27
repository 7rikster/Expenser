import { nightlyScheduler } from "./cron/daily";
import { monthlyScheduler } from "./cron/monthly";
import { processInsights } from "./functions/generateInsight";
import { processMonthlyReviewWithAI } from "./functions/monthlyReviewWithAI";
import { processMonthlyReviewWithoutAI } from "./functions/monthlyReviewWithoutAI";
export const functions = [nightlyScheduler, monthlyScheduler, processInsights, processMonthlyReviewWithoutAI, processMonthlyReviewWithAI];
