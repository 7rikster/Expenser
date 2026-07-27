import { ConfirmDeleteDB } from "src/services/assistant/actions/confirmDeleteDB";
import { DeleteDB } from "src/services/assistant/actions/deleteDB";

/**
 * Find transactions matching filters for deletion confirmation.
 * Delegates to existing ConfirmDeleteDB handler.
 */
export async function confirmDeleteTransaction({
  userId,
  args,
}: {
  userId: string;
  args: {
    limit?: number;
    category?: string;
    type?: "INCOME" | "EXPENSE";
    merchantName?: string;
    startDate?: string;
    endDate?: string;
  };
}) {
  const result = await ConfirmDeleteDB({
    userId,
    clerkUserId: "",
    data: { dbQueryFilters: args },
  });
  return result;
}

/**
 * Execute deletion of confirmed transactions.
 * Delegates to existing DeleteDB handler.
 */
export async function executeDeleteTransaction({
  userId,
  clerkUserId,
  context,
}: {
  userId: string;
  clerkUserId: string;
  context: { dbTransactionIds: string[] };
}) {
  const result = await DeleteDB({
    userId,
    clerkUserId,
    data: {},
    dbTransactionIds: context.dbTransactionIds,
  });
  return result;
}
