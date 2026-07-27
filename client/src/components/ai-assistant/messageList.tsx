"use client";

import React, { useRef, useEffect } from "react";
import { Bot, Activity } from "lucide-react";
import { Message, useAssistantStore } from "@/store/assistant-store";
import MessageBubble from "./messageBubble";

interface MessageListProps {
  messages: Message[];
  isProcessing: boolean;
}

const TOOL_LABELS: Record<string, { emoji: string; label: string }> = {
  retrieve_financial_context: { emoji: "🧠", label: "Searching financial memory..." },
  get_spending_summary: { emoji: "📊", label: "Analyzing spending..." },
  get_budget_status: { emoji: "💰", label: "Checking budget..." },
  compare_months: { emoji: "📈", label: "Comparing months..." },
  get_category_breakdown: { emoji: "🏷️", label: "Breaking down categories..." },
  predict_end_of_month: { emoji: "🔮", label: "Projecting spending..." },
  calculate_savings_plan: { emoji: "🎯", label: "Creating savings plan..." },
  get_recurring_expenses: { emoji: "🔄", label: "Finding subscriptions..." },
  search_transactions: { emoji: "🔍", label: "Searching transactions..." },
  create_draft_transactions: { emoji: "📝", label: "Extracting transactions..." },
  approve_drafts: { emoji: "✅", label: "Saving to database..." },
  confirm_delete_transaction: { emoji: "🗑️", label: "Finding transaction..." },
  execute_delete_transaction: { emoji: "🗑️", label: "Deleting transaction..." },
  manage_drafts: { emoji: "✏️", label: "Updating drafts..." },
};

export default function MessageList({ messages, isProcessing }: MessageListProps) {
  const listEndRef = useRef<HTMLDivElement>(null);
  const streamingText = useAssistantStore((s) => s.streamingText);
  const activeToolCalls = useAssistantStore((s) => s.activeToolCalls);

  const scrollToBottom = () => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, streamingText, activeToolCalls]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-full text-zinc-400 animate-bounce">
          <Bot className="w-12 h-12" />
        </div>
        <div>
          <h2 className="font-bold text-zinc-800 dark:text-zinc-200">Your Financial Copilot</h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Ask me anything — <span className="italic text-zinc-500">&quot;Where do I spend most?&quot;</span>, <span className="italic text-zinc-500">&quot;Will I exceed my budget?&quot;</span>, or send a receipt to log transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-4 auto-scrollbar min-h-0 w-full px-2">
      <div className="max-w-4xl space-y-4 mx-auto w-full auto-scrollbar">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isProcessing && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-start">
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="space-y-2 w-full max-w-sm">
              {/* Active tool call indicators */}
              {activeToolCalls.length > 0 && (
                <div className="flex flex-col gap-1">
                  {activeToolCalls.map((tool) => {
                    const info = TOOL_LABELS[tool] || { emoji: "⚡", label: "Processing..." };
                    return (
                      <div
                        key={tool}
                        className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/30 rounded-xl px-3 py-1.5 w-fit animate-pulse"
                      >
                        <Activity className="w-3 h-3" />
                        <span>{info.emoji} {info.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Streaming text preview */}
              {streamingText ? (
                <div className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                  <p className="leading-relaxed text-xs md:text-sm whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 bg-violet-500 animate-pulse ml-0.5 rounded-sm" />
                  </p>
                </div>
              ) : activeToolCalls.length === 0 ? (
                /* Bouncing dots fallback */
                <div className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl px-4 py-3 flex gap-1.5 items-center w-[70px] justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span>
                </div>
              ) : null}
            </div>
          </div>
        )}
        <div ref={listEndRef} />
      </div>
    </div>
  );
}