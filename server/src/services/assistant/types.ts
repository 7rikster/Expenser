export enum AssistantAction {
  LIST_DB = "LIST_DB",
  DELETE_DB = "DELETE_DB",
  CONFIRM_DELETE_DB = "CONFIRM_DELETE_DB",
  APPROVE_DRAFTS = "APPROVE_DRAFTS",
  CREATE_DRAFT = "CREATE_DRAFT",
  UPDATE_DRAFT = "UPDATE_DRAFT",
  DELETE_DRAFT = "DELETE_DRAFT",
}

export interface AssistantActionContext {
  userId: string;
  clerkUserId: string;
  data: any;
  dbTransactionIds?: string[]; // for delete action, to specify which transactions to delete
}

