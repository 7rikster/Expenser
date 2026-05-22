"use client";

import React, { useRef, useEffect } from "react";
import { Bot } from "lucide-react";
import { Message } from "@/store/assistant-store";
import MessageBubble from "./messageBubble";

interface MessageListProps {
  messages: Message[];
  isProcessing: boolean;
}

export default function MessageList({ messages, isProcessing }: MessageListProps) {
  const listEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400 animate-bounce">
          <Bot className="w-12 h-12" />
        </div>
        <div>
          <h2 className="font-bold text-zinc-800 dark:text-zinc-200">Log Transactions Instantly</h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Send a message like <span className="italic text-zinc-500">"Paid $12.50 to Subway for lunch yesterday"</span> or drag and drop a Google Pay/PhonePe screenshot or store receipt here to parse it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-4 space-y-4 px-2 scrollbar-none">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isProcessing && (
        <div className="flex gap-3 max-w-[80%] mr-auto items-start">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="space-y-2 w-full max-w-sm">
            <div className="bg-zinc-100/70 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl px-4 py-3 flex gap-1.5 items-center w-[70px] justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span>
            </div>
            
            <div className="w-[300px] h-[150px] border border-zinc-100 dark:border-zinc-900 rounded-xl bg-zinc-100/30 dark:bg-zinc-900/10 p-3 space-y-3 flex flex-col justify-between">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-850 rounded w-1/3 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 bg-zinc-250 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 bg-zinc-250 dark:bg-zinc-800 rounded w-5/6 animate-pulse" />
              </div>
              <div className="h-8 bg-zinc-250 dark:bg-zinc-800 rounded w-full animate-pulse" />
            </div>
          </div>
        </div>
      )}
      <div ref={listEndRef} />
    </div>
  );
}