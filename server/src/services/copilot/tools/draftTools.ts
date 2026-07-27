import { ApproveDrafts } from "src/services/assistant/actions/approveDrafts";

/**
 * Pass-through: LLM generates draft transactions, we just return them
 * so the frontend can render interactive cards.
 */
export function createDrafts({
  args,
}: {
  args: { transactions: any[]; [key: string]: any };
}) {
  return {
    drafts: args.transactions || [],
  };
}

/**
 * LLM returns updated draft list after modifications.
 */
export function manageDrafts({
  args,
}: {
  args: { action: string; updatedDrafts: any[]; [key: string]: any };
}) {
  return {
    action: args.action,
    drafts: args.updatedDrafts || [],
  };
}

/**
 * Approve all pending drafts and save to database.
 * Delegates to the existing ApproveDrafts action handler.
 */
export async function approveDrafts({
  userId,
  clerkUserId,
  context,
}: {
  userId: string;
  clerkUserId: string;
  context: { pendingDrafts: any[] };
}) {
  const result = await ApproveDrafts({
    userId,
    clerkUserId,
    data: { draftTransactions: context.pendingDrafts },
  });
  return result;
}
