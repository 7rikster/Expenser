import { prisma } from "../../../lib/index.js";
import { generateAndStoreMonthlyReviewWithoutAI } from "../../analytics/monthlyReviewWithoutAI.js";

/**
 * Fetches the MonthlyReview for a given user and month.
 * For the current month, force-regenerates it to ensure real-time accuracy of live transactions.
 * For previous months, uses the cached review database record, creating it once if missing.
 */
export async function getOrGenerateMonthlyReview(userId: string, monthDate: Date) {
  const now = new Date();
  const isCurrentMonth =
    monthDate.getUTCFullYear() === now.getUTCFullYear() &&
    monthDate.getUTCMonth() === now.getUTCMonth();

  // 1. Force regeneration for the current month to capture live, same-day transactions
  if (isCurrentMonth) {
    return generateAndStoreMonthlyReviewWithoutAI(userId, monthDate);
  }

  // 2. Fetch cached review for past months
  let review = await prisma.monthlyReview.findUnique({
    where: { userId_month: { userId, month: monthDate } },
  });

  // 3. Fallback: if historical review is missing, generate it once
  if (!review) {
    review = await generateAndStoreMonthlyReviewWithoutAI(userId, monthDate);
  }

  return review;
}
