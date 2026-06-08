import { AssistantActionContext } from "../types";

export const DraftChanges = ({ data }: AssistantActionContext) => {
  return {
    status: "success",
    msg: "Parsed successfully",
    action: data.action,
    transactions: data.draftTransactions || [],
    dbQueryFilters: data.dbQueryFilters || {},
    replyText: data.replyText,
  };
};
