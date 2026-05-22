"use client";

import React from "react";
import { Bot } from "lucide-react";
import { Message } from "@/store/assistant-store";
import InteractiveMultiExpenseCard from "./InteractiveMultiExpenseCard";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
        isUser 
          ? "bg-primary text-white font-semibold text-xs" 
          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
      }`}>
        {isUser ? "U" : <Bot className="w-4 h-4" />}
      </div>

      <div className="space-y-2 max-w-full">
        <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isUser 
            ? "bg-primary text-white" 
            : "bg-white dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 text-zinc-800 dark:text-zinc-200"
        }`}>
          {message.imageUrl && (
            <div className="mb-2 max-w-xs rounded-lg overflow-hidden border border-white/20 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={message.imageUrl} 
                alt="Uploaded receipt" 
                className="w-full h-auto max-h-[160px] object-cover hover:scale-105 transition-transform" 
              />
            </div>
          )}
          <p className="leading-relaxed text-xs md:text-sm whitespace-pre-wrap">{message.text}</p>
          <span className={`block text-[9px] text-right mt-1.5 select-none ${
            isUser ? "text-white/60" : "text-zinc-400"
          }`}>
            {message.timestamp}
          </span>
        </div>

        {message.candidates && message.candidates.length > 0 && (
          <div className="w-full max-w-md mt-1">
            <InteractiveMultiExpenseCard 
              messageId={message.id} 
              candidates={message.candidates} 
              status={message.status || "pending"} 
            />
          </div>
        )}
      </div>
    </div>
  );
}