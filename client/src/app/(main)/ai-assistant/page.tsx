"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useAssistantStore } from "@/store/assistant-store";
import { useCopilotStream } from "@/hooks/use-assistant";
import ChatHeader from "@/components/ai-assistant/chatHeader";
import MessageList from "@/components/ai-assistant/messageList";
import InputTray from "@/components/ai-assistant/inputTray";
import { toast } from "sonner";

export default function AIAssistantPage() {
  const {
    messages,
    addMessage,
    clearChat,
    isProcessing,
    setProcessing,
    pendingDbTransactionIds,
    lastAssistantMessage,
  } = useAssistantStore();
  const { sendMessage } = useCopilotStream();

  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    return () => {
      if (filePreview && filePreview.startsWith("blob:")) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  const handleFileRemove = () => {
    if (filePreview.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview("");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image uploads are supported (receipts/screenshots)");
        return;
      }
      handleFileSelect(file);
    }
  };

  const handleSubmit = async () => {
    const userText = inputText;
    const userImage = filePreview;
    const targetFile = selectedFile;

    setInputText("");
    setSelectedFile(null);
    setFilePreview("");

    // Add user message to store
    addMessage({
      sender: "user",
      action: "GENERAL",
      text: userText,
      imageUrl: userImage || undefined,
    });

    // Find pending drafts for context
    const lastPendingMessage = [...messages].reverse().find(
      (msg) =>
        (msg.action === "CREATE_DRAFT" ||
          msg.action === "UPDATE_DRAFT" ||
          msg.action === "DELETE_DRAFT") &&
        msg.status === "pending" &&
        msg.candidates &&
        msg.candidates.length > 0
    );
    const pendingDrafts = lastPendingMessage ? lastPendingMessage.candidates : [];

    // Build FormData
    const formData = new FormData();
    if (userText) formData.append("message", userText);
    if (targetFile) formData.append("file", targetFile);
    if (pendingDrafts && pendingDrafts.length > 0) {
      formData.append("pendingTransactions", JSON.stringify(pendingDrafts));
    }
    if (pendingDbTransactionIds) {
      formData.append("dbTransactionIds", JSON.stringify(pendingDbTransactionIds));
    }
    if (lastAssistantMessage) {
      formData.append("lastAssistantMessage", lastAssistantMessage);
    }

    // Stream via SSE — the hook handles everything
    await sendMessage(formData);
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`h-[calc(100vh-4rem)] overflow-hidden flex flex-col justify-center  mx-auto pb-2 relative transition-all duration-200 ${
        dragActive ? "bg-violet-500/5 backdrop-blur-sm" : ""
      }`}
    >
      {dragActive && (
        <div className="absolute inset-0 border-2 border-dashed border-violet-500 m-4 rounded-2xl flex items-center justify-center pointer-events-none z-50 bg-zinc-950/20 backdrop-blur-sm">
          <div className="text-center text-violet-500 flex flex-col items-center gap-2">
            <Sparkles className="w-12 h-12 animate-pulse" />
            <p className="font-semibold text-lg">Drop your receipt or UPI screenshot here</p>
          </div>
        </div>
      )}

      {/* <ChatHeader 
        hasMessages={messages.length > 0} 
        onClearChat={clearChat} 
      /> */}

      <MessageList
        messages={messages}
        isProcessing={isProcessing}
      />
      <div className="max-w-4xl mx-auto w-full px-2 pb-2 md:pb-4 ">

      <InputTray
        inputText={inputText}
        setInputText={setInputText}
        selectedFile={selectedFile}
        filePreview={filePreview}
        isProcessing={isProcessing}
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
        onSubmit={handleSubmit}
        />
        </div>
    </div>
  );
}