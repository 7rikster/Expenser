"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useAssistantStore } from "@/store/assistant-store";
import { useProcessAssistantMessage } from "@/hooks/use-assistant";
import ChatHeader from "@/components/ai-assistant/chatHeader";
import MessageList from "@/components/ai-assistant/messageList";
import InputTray from "@/components/ai-assistant/inputTray";
import { toast } from "sonner";

export default function AIAssistantPage() {
  const { messages, addMessage, clearChat, isProcessing, setProcessing } = useAssistantStore();
  const processMessageMutation = useProcessAssistantMessage();

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

  const add_expense = async(formData: FormData) => {
    try{
      const response = await processMessageMutation.mutateAsync(formData);
      const parsedTransactions = response.transactions.map((tx: any) => ({
        ...tx,
        id: crypto.randomUUID(),
      }));

      addMessage({
        sender: "assistant",
        text: parsedTransactions.length > 0
          ? `I extracted ${parsedTransactions.length} transaction candidate(s) from your input. Please verify the details below:`
          : "I couldn't detect any transactions in your message or image. Could you try re-phrasing or uploading a clearer screenshot?",
        candidates: parsedTransactions.length > 0 ? parsedTransactions : undefined,
        status: parsedTransactions.length > 0 ? "pending" : undefined,
      });
    } catch(err:any){
      toast.error(err.message || "Failed to process inputs");
      addMessage({
        sender: "assistant",
        text: "Sorry, I encountered an error while adding the expense(s). Please try again.",
      });
    }
  }

  const handleSubmit = async () => {
    const userText = inputText;
    const userImage = filePreview;
    const targetFile = selectedFile;

    setInputText("");
    setSelectedFile(null);
    setFilePreview("");

    addMessage({
      sender: "user",
      text: userText,
      imageUrl: userImage || undefined,
    });

    setProcessing(true);

    try {
      const formData = new FormData();
      if (userText) formData.append("message", userText);
      if (targetFile) formData.append("file", targetFile);

      await add_expense(formData);

    } catch (err: any) {
      console.log("Error processing assistant message:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div 
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`h-full flex flex-col max-w-4xl mx-auto py-3 relative transition-all duration-200 ${
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
  );
}