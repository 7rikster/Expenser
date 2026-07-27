import { getSpendingSummary } from "./tools/getSpendingSummary.js";
import { getBudgetStatus } from "./tools/getBudgetStatus.js";
import { compareMonths } from "./tools/compareMonths.js";
import { getCategoryBreakdown } from "./tools/getCategoryBreakdown.js";
import { predictEndOfMonth } from "./tools/predictEndOfMonth.js";
import { calculateSavingsPlan } from "./tools/calculateSavingsPlan.js";
import { getRecurringExpenses } from "./tools/getRecurringExpenses.js";
import { searchTransactions } from "./tools/searchTransactions.js";
import { createDrafts, manageDrafts, approveDrafts } from "./tools/draftTools.js";
import {
  confirmDeleteTransaction,
  executeDeleteTransaction,
} from "./tools/deleteTransactionTool.js";

export interface ToolCallContext {
  pendingDrafts: any[];
  dbTransactionIds: string[];
}

export async function executeToolCall(
  toolName: string,
  userId: string,
  clerkUserId: string,
  args: Record<string, any>,
  context: ToolCallContext
): Promise<any> {
  switch (toolName) {
    case "get_spending_summary":
      return getSpendingSummary({ userId, args });

    case "get_budget_status":
      return getBudgetStatus({ userId, args });

    case "compare_months":
      return compareMonths({ userId, args });

    case "get_category_breakdown":
      return getCategoryBreakdown({ userId, args });

    case "predict_end_of_month":
      return predictEndOfMonth({ userId, args });

    case "calculate_savings_plan":
      return calculateSavingsPlan({ userId, args: args as any });

    case "get_recurring_expenses":
      return getRecurringExpenses({ userId });

    case "search_transactions":
      return searchTransactions({ userId, args });

    case "create_draft_transactions":
      return createDrafts({ args: args as any });

    case "manage_drafts":
      return manageDrafts({ args: args as any });

    case "approve_drafts":
      return approveDrafts({ userId, clerkUserId, context });

    case "confirm_delete_transaction":
      return confirmDeleteTransaction({ userId, args });

    case "execute_delete_transaction":
      return executeDeleteTransaction({ userId, clerkUserId, context });

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
