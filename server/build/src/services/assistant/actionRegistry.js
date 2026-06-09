import { DraftChanges } from "./actions/draftChanges";
import { ListDB } from "./actions/listDB";
import { ConfirmDeleteDB } from "./actions/confirmDeleteDB";
import { ApproveDrafts } from "./actions/approveDrafts";
import { DeleteDB } from "./actions/deleteDB";
import { AssistantAction } from "./types";
export const actionHandlers = {
    [AssistantAction.LIST_DB]: ListDB,
    [AssistantAction.DELETE_DB]: DeleteDB,
    [AssistantAction.CONFIRM_DELETE_DB]: ConfirmDeleteDB,
    [AssistantAction.APPROVE_DRAFTS]: ApproveDrafts,
    [AssistantAction.CREATE_DRAFT]: DraftChanges,
    [AssistantAction.UPDATE_DRAFT]: DraftChanges,
    [AssistantAction.DELETE_DRAFT]: DraftChanges,
    [AssistantAction.GENERAL]: DraftChanges,
};
export const executeAction = async (action, context) => {
    const handler = actionHandlers[action];
    console.log("Executing action:", handler);
    console.log("With context:", context);
    if (!handler) {
        return {
            status: "Failed",
            msg: "Invalid action",
            action: "GENERAL",
            transactions: [],
            replyText: context.data.replyText || "I can't perform the specified task"
        };
    }
    return handler(context);
};
