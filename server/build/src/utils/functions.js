export function startOfDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
export function startOfMonth(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
export function calculateNextRecurringDate(startDate, interval) {
    const date = new Date(startDate);
    switch (interval) {
        case "DAILY":
            date.setDate(date.getDate() + 1);
            break;
        case "WEEKLY":
            date.setDate(date.getDate() + 7);
            break;
        case "MONTHLY":
            date.setMonth(date.getMonth() + 1);
            break;
        case "YEARLY":
            date.setFullYear(date.getFullYear() + 1);
            break;
    }
    return date;
}
export const getTopCategoriesWithOthersAndPercentage = (items, topN = 4, totalAmount) => {
    if (!items || items.length === 0)
        return [];
    const normalized = items
        .map((item) => ({
        category: item.category,
        amount: Number(item.amount),
    }));
    const total = totalAmount.toNumber();
    if (total === 0)
        return [];
    const topCategories = normalized.slice(0, topN);
    const remaining = normalized.slice(topN);
    let result = [...topCategories];
    if (remaining.length > 0) {
        const othersTotal = remaining.reduce((sum, item) => sum + item.amount, 0);
        result.push({
            category: "Others",
            amount: othersTotal,
        });
    }
    return result.map((item) => ({
        category: item.category,
        amount: item.amount,
        percentage: Number(((item.amount / total) * 100).toFixed(2)),
    }));
};
export function toLocalDateString(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
export function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
export function getWeekEnd(weekStart) {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + 7);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
export async function invalidateTransactionListCache(redis, clerkUserId) {
    const pattern = `txn-list:${clerkUserId}:*`;
    let cursor = "0";
    do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = nextCursor;
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } while (cursor !== "0");
}
