"use client";

import React from "react";
import { Bot, Trash2 } from "lucide-react";

interface ChatHeaderProps {
  hasMessages: boolean;
  onClearChat: () => void;
}

export default function ChatHeader({ hasMessages, onClearChat }: ChatHeaderProps) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/20 backdrop-blur-md sticky top-0 z-10 px-2 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-500/20">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
            Expenser AI Assistant <span className="text-[10px] font-normal px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">Gemini 2.5</span>
          </h1>
          <p className="text-[10px] text-zinc-400">Scan screenshots or ask anything in plain text</p>
        </div>
      </div>
      {hasMessages && (
        <button
          onClick={onClearChat}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Conversation</span>
        </button>
      )}
    </div>
  );
}