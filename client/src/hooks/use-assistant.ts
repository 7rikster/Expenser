"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import { useAuthApi } from "./use-dashboard";
import { CandidateTransaction, useAssistantStore } from "./../store/assistant-store";

// ── Legacy hook (kept for backward compatibility) ───────────
interface AssistantResponse {
  action:
    | "CREATE_DRAFT"
    | "UPDATE_DRAFT"
    | "DELETE_DRAFT"
    | "APPROVE_DRAFTS"
    | "LIST_DB"
    | "CONFIRM_DELETE_DB"
    | "DELETE_DB"
    | "COPILOT_RESPONSE"
    | "GENERAL";

  replyText: string;
  draftTransactions?: CandidateTransaction[];
  transactions?: CandidateTransaction[];
  dbQueryFilters?: {
    limit?: number;
    category?: string;
    type?: "INCOME" | "EXPENSE";
    merchantName?: string;
    startDate?: string;
    endDate?: string;
  };
}

export function useProcessAssistantMessage() {
  const authFetch = useAuthApi();
  return useMutation({
    mutationFn: (formData: FormData) =>
      authFetch<AssistantResponse>("/ai/assistant", {
        method: "POST",
        data: formData,
      }),
  });
}

export function useBulkCreateTransactions() {
  const authFetch = useAuthApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactions: Omit<CandidateTransaction, "id">[]) =>
      authFetch("/transaction/bulk-create", {
        method: "POST",
        data: { transactions },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["category-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-pattern"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-trend"] });
    },
  });
}

// ── New Copilot SSE Streaming Hook ──────────────────────────

function handleSSEDoneEvent(
  data: any,
  store: typeof useAssistantStore,
  queryClient: ReturnType<typeof useQueryClient>
) {
  const { action, replyText, transactions, dbTransactionIds } = data;

  // Find the last pending draft message for context
  const messages = store.getState().messages;
  const lastPendingMessage = [...messages].reverse().find(
    (msg) =>
      (msg.action === "CREATE_DRAFT" ||
        msg.action === "UPDATE_DRAFT" ||
        msg.action === "DELETE_DRAFT") &&
      msg.status === "pending" &&
      msg.candidates &&
      msg.candidates.length > 0
  );

  switch (action) {
    case "CREATE_DRAFT": {
      const parsedTransactions = (transactions || []).map((tx: CandidateTransaction) => ({
        ...tx,
        id: tx.id || crypto.randomUUID(),
      }));
      store.getState().addMessage({
        sender: "assistant",
        action: "CREATE_DRAFT",
        text: replyText || (parsedTransactions.length > 0
          ? `I extracted ${parsedTransactions.length} transaction(s). Please verify:`
          : "I couldn't detect any transactions."),
        candidates: parsedTransactions.length > 0 ? parsedTransactions : undefined,
        status: parsedTransactions.length > 0 ? "pending" : undefined,
      });
      store.getState().setLastAssistantMessage(replyText);
      break;
    }

    case "APPROVE_DRAFTS": {
      if (lastPendingMessage) {
        store.getState().updateMessageStatus(lastPendingMessage.id, "approved");
      }
      store.getState().addMessage({
        sender: "assistant",
        text: replyText,
        status: "approved",
        action: "GENERAL",
      });
      store.getState().setLastAssistantMessage(replyText);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["category-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-pattern"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-trend"] });
      break;
    }

    case "UPDATE_DRAFT":
    case "DELETE_DRAFT": {
      if (lastPendingMessage) {
        store.getState().updateMessageStatus(lastPendingMessage.id, "dismissed");
      }
      store.getState().addMessage({
        sender: "assistant",
        action: action,
        text: replyText,
        candidates: transactions,
        status: transactions && transactions.length > 0 ? "pending" : "dismissed",
      });
      store.getState().setLastAssistantMessage(replyText);
      break;
    }

    case "CONFIRM_DELETE_DB": {
      store.getState().addMessage({
        sender: "assistant",
        action: "CONFIRM_DELETE_DB",
        text: replyText,
        candidates: transactions && transactions.length > 0 ? transactions : undefined,
        status: transactions && transactions.length > 0 ? "pending" : undefined,
      });
      const assistantReply =
        transactions && transactions.length > 0
          ? `${replyText} Here are the details: ${transactions
              .map(
                (tx: CandidateTransaction) =>
                  `- ID:${tx.id} - ${tx.type} of ₹${tx.amount} in category "${tx.category}" on ${tx.date}`
              )
              .join("\n")}`
          : replyText;
      store.getState().setLastAssistantMessage(assistantReply);
      store.getState().setPendingDbTransactionIds(
        dbTransactionIds || (transactions ? transactions.map((tx: CandidateTransaction) => tx.id) : null)
      );
      break;
    }

    case "DELETE_DB": {
      store.getState().setPendingDbTransactionIds(null);
      store.getState().addMessage({
        sender: "assistant",
        action: "DELETE_DB",
        text: replyText,
        status: "approved",
      });
      store.getState().setLastAssistantMessage(replyText);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["category-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-pattern"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-trend"] });
      break;
    }

    case "LIST_DB": {
      store.getState().addMessage({
        sender: "assistant",
        action: "LIST_DB",
        text: replyText,
        candidates: transactions && transactions.length > 0 ? transactions : undefined,
        status: transactions && transactions.length > 0 ? "dismissed" : undefined,
      });
      store.getState().setLastAssistantMessage(replyText);
      break;
    }

    case "COPILOT_RESPONSE":
    case "GENERAL":
    default: {
      store.getState().addMessage({
        sender: "assistant",
        text: replyText,
        action: action === "COPILOT_RESPONSE" ? "COPILOT_RESPONSE" : "GENERAL",
      });
      store.getState().setLastAssistantMessage(replyText);
      break;
    }
  }
}

export function useCopilotStream() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const store = useAssistantStore;

  const sendMessage = useCallback(
    async (formData: FormData) => {
      const token = await getToken();
      store.getState().setProcessing(true);
      store.getState().clearStreamingText();
      store.getState().clearToolCalls();

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/ai/copilot`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (eventType) {
                  case "tool_start":
                    store.getState().addToolCall(data.tool);
                    break;
                  case "tool_end":
                    store.getState().removeToolCall(data.tool);
                    break;
                  case "text_delta":
                    store.getState().appendStreamingText(data.delta);
                    break;
                  case "done":
                    handleSSEDoneEvent(data, store, queryClient);
                    break;
                  case "error":
                    store.getState().addMessage({
                      sender: "assistant",
                      action: "GENERAL",
                      text: data.message || "Something went wrong.",
                    });
                    break;
                }
              } catch {
                // Ignore JSON parse errors in SSE stream
              }
              eventType = "";
            }
          }
        }
      } catch (error: any) {
        console.error("Copilot stream error:", error);
        store.getState().addMessage({
          sender: "assistant",
          action: "GENERAL",
          text: "Sorry, something went wrong while processing your request. Please try again.",
        });
      } finally {
        store.getState().setProcessing(false);
        store.getState().clearStreamingText();
        store.getState().clearToolCalls();
      }
    },
    [getToken, queryClient, store]
  );

  return { sendMessage };
}