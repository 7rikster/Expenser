import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CandidateTransaction {
  id: string; // Client-side client key
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
  text: string;
  timestamp: string;
  imageUrl?: string; // Preview image blob/base64 URL
  candidates?: CandidateTransaction[]; // Pending draft list
  status?: "pending" | "approved" | "dismissed";
}

interface AssistantState {
  messages: Message[];
  isProcessing: boolean;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => string;
  updateMessageStatus: (messageId: string, status: "pending" | "approved" | "dismissed") => void;
  updateCandidate: (messageId: string, candidateId: string, updates: Partial<CandidateTransaction>) => void;
  removeCandidate: (messageId: string, candidateId: string) => void;
  setProcessing: (isProcessing: boolean) => void;
  clearChat: () => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      messages: [],
      isProcessing: false,
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
      setProcessing: (isProcessing) => set({ isProcessing }),
      clearChat: () => set({ messages: [], isProcessing: false }),
    }),
    {
      name: "expenser-ai-assistant",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);