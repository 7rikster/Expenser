"use client";

import React from "react";
import { Bot, Trash2 } from "lucide-react";
import { useAssistantStore } from "@/store/assistant-store";
import { toast } from "sonner";

interface ChatHeaderProps {
  hasMessages: boolean;
  onClearChat: () => void;
}

export default function ChatHeader() {

  const {
      messages,
      clearChat,
    } = useAssistantStore();

    const handleClearChat = () => {
    clearChat();
    toast.success("Chat history cleared");
  };
  return (
    <div className="dark:bg-black rounded-lg">  
      {messages.length > 0 && (
        <button
          onClick={handleClearChat}
          className="flex items-center gap-1.5 text-xs  hover:text-red-500 transition-colors p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Conversation</span>
        </button>
      )}
    </div>
  );
}