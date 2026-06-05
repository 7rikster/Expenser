import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CandidateTransaction {
  id: string; 
  amount: number;
  date: string;
  description: string;
  merchantName?: string;
  category: string;
  type: "INCOME" | "EXPENSE";
}

export interface Message {
  id: string;
  sender: "user" | "assistant";
  action: "CREATE_DRAFT"
    | "UPDATE_DRAFT"
    | "DELETE_DRAFT"
    | "APPROVE_DRAFTS"
    | "LIST_DB"
    | "CONFIRM_DELETE_DB"
    | "DELETE_DB"
    | "GENERAL";
  text: string;
  timestamp: string;
  imageUrl?: string;
  candidates?: CandidateTransaction[];
  status?: "pending" | "approved" | "dismissed";
}

interface AssistantState {
  messages: Message[];
  isProcessing: boolean;
  lastAssistantMessage: string | null;
  pendingDbTransactionIds: string[] | null; // Targets live DB item for confirmation deletions
  addMessage: (message: Omit<Message, "id" | "timestamp">) => string;
  updateMessageStatus: (messageId: string, status: "pending" | "approved" | "dismissed") => void;
  updateCandidate: (messageId: string, candidateId: string, updates: Partial<CandidateTransaction>) => void;
  removeCandidate: (messageId: string, candidateId: string) => void;
  setLastAssistantMessage: (message: string | null) => void;
  setPendingDbTransactionIds: (ids: string[] | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  clearChat: () => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      messages: [],
      isProcessing: false,
      lastAssistantMessage: null,
      pendingDbTransactionIds: null,
      addMessage: (msg) => {
        const id = crypto.randomUUID();
        const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        set((state) => ({
          messages: [...state.messages, { ...msg, id, timestamp }]
        }));
        return id;
      },
      updateMessageStatus: (messageId, status) => set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, status } : msg
        )
      })),
      updateCandidate: (messageId, candidateId, updates) => set((state) => ({
        messages: state.messages.map((msg) => {
          if (msg.id !== messageId || !msg.candidates) return msg;
          return {
            ...msg,
            candidates: msg.candidates.map((c) =>
              c.id === candidateId ? { ...c, ...updates } : c
            )
          };
        })
      })),
      removeCandidate: (messageId, candidateId) => set((state) => ({
        messages: state.messages.map((msg) => {
          if (msg.id !== messageId || !msg.candidates) return msg;
          const updatedCandidates = msg.candidates.filter((c) => c.id !== candidateId);
          return {
            ...msg,
            candidates: updatedCandidates,
            status: updatedCandidates.length === 0 ? "dismissed" : msg.status
          };
        })
      })),
      setPendingDbTransactionIds: (pendingDbTransactionIds) => set({ pendingDbTransactionIds }),
      setLastAssistantMessage: (lastAssistantMessage) => set({ lastAssistantMessage }),
      setProcessing: (isProcessing) => set({ isProcessing }),
      clearChat: () => set({ messages: [], isProcessing: false, pendingDbTransactionIds: null }),
    }),
    {
      name: "expenser-ai-assistant",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);