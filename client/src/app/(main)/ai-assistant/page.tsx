"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { CandidateTransaction, useAssistantStore } from "@/store/assistant-store";
import { useProcessAssistantMessage } from "@/hooks/use-assistant";
import ChatHeader from "@/components/ai-assistant/chatHeader";
import MessageList from "@/components/ai-assistant/messageList";
import InputTray from "@/components/ai-assistant/inputTray";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AIAssistantPage() {
  const queryClient = useQueryClient();
  const { messages, addMessage, clearChat, isProcessing, setProcessing, updateMessageStatus, pendingDbTransactionIds, setPendingDbTransactionIds, lastAssistantMessage, setLastAssistantMessage } = useAssistantStore();
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

  const add_expense = (transactions: CandidateTransaction[]) => {
    
    const parsedTransactions = transactions.map((tx: CandidateTransaction) => ({
      ...tx,
      id: crypto.randomUUID(),
    }));

    addMessage({
      sender: "assistant",
      action: "CREATE_DRAFT",
      text: parsedTransactions.length > 0
        ? `I extracted ${parsedTransactions.length} transaction candidate(s) from your input. Please verify the details below:`
        : "I couldn't detect any transactions in your message or image. Could you try re-phrasing or uploading a clearer screenshot?",
      candidates: parsedTransactions.length > 0 ? parsedTransactions : undefined,
      status: parsedTransactions.length > 0 ? "pending" : undefined,
    });

    setLastAssistantMessage(parsedTransactions.length > 0 ? `I extracted ${parsedTransactions.length} transaction candidate(s) from your input. Please verify the details below:` : "I couldn't detect any transactions in your message or image. Could you try re-phrasing or uploading a clearer screenshot?");
    
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
      action: "GENERAL",
      text: userText,
      imageUrl: userImage || undefined,
    });

    setProcessing(true);

    try {
      const lastPendingMessage = [...messages].reverse().find(
        (msg) => (msg.action === "CREATE_DRAFT" || msg.action === "UPDATE_DRAFT" || msg.action === "DELETE_DRAFT") && msg.status === "pending" && msg.candidates && msg.candidates.length > 0
      );
      const pendingDrafts = lastPendingMessage ? lastPendingMessage.candidates : [];

      const formData = new FormData();
      if (userText) formData.append("message", userText);
      if (targetFile) formData.append("file", targetFile);
      if (pendingDrafts && pendingDrafts.length > 0) {
        formData.append("pendingTransactions", JSON.stringify(pendingDrafts));
        console.log("Including pending transactions in request:", pendingDrafts);
      }
      if (pendingDbTransactionIds) {
        formData.append("dbTransactionIds", JSON.stringify(pendingDbTransactionIds));
        // console.log("Including pending DB transaction IDs in request:", pendingDbTransactionIds);
      }
      if (lastAssistantMessage) {
        formData.append("lastAssistantMessage", lastAssistantMessage);
        // console.log("Including last assistant message in request:", lastAssistantMessage);
      }


      const response = await processMessageMutation.mutateAsync(formData);
      console.log("Assistant response:", response);
      const { action, replyText, transactions } = response;

      // Perform different actions based on the action returned by the assistant
      if(action === "CREATE_DRAFT") {
        add_expense(transactions || []);
      }
      else if(action === "APPROVE_DRAFTS"){
        if (lastPendingMessage) {
          updateMessageStatus(lastPendingMessage.id, "approved");
        }
        addMessage({
          sender: "assistant",
          text: replyText,
          status: "approved",
          action: "GENERAL",
        });
        setLastAssistantMessage(replyText);
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["category-breakdown"] });
        queryClient.invalidateQueries({ queryKey: ["weekly-pattern"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["monthly-trend"] });
        toast.success("All transactions logged!");
      }
      else if (action === "UPDATE_DRAFT" || action === "DELETE_DRAFT") {
        // console.log("Draft update/delete action received.");
        if (lastPendingMessage) {
          updateMessageStatus(lastPendingMessage.id, "dismissed");
        }
        addMessage({
          sender: "assistant",
          action: action,
          text: replyText,
          candidates: transactions,
          status: transactions && transactions.length > 0 ? "pending" : "dismissed",
        });
      }
      else if (action === "CONFIRM_DELETE_DB") {
        // Stage the database transaction ID returned by the server
        // console.log("Confirm Delete DB action received.");
        addMessage({
          sender: "assistant",
          action: "CONFIRM_DELETE_DB",
          text: replyText,
          candidates: transactions && transactions.length > 0 ? transactions : undefined,
          status: transactions && transactions.length > 0 ? "pending" : undefined,
        });
        const assistantReply = transactions && transactions.length > 0
          ? `${replyText} Here are the details: ${transactions.map((tx: CandidateTransaction) => `- ID:${tx.id} - ${tx.type} of ₹${tx.amount} in category "${tx.category}" on ${tx.date}`).join("\n")}`
          : replyText;
        setLastAssistantMessage(assistantReply);
        setPendingDbTransactionIds(transactions ? transactions.map((tx: CandidateTransaction) => tx.id) : null);
      } 
      
      else if (action === "DELETE_DB") {
        // Complete the deletion workflow
        // console.log("Confirm Delete DB action received.");
        setPendingDbTransactionIds(null);
        addMessage({
          sender: "assistant",
          action: "DELETE_DB",
          text: replyText,
          status: "approved",
        });
        setLastAssistantMessage(replyText);   
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["category-breakdown"] });
        queryClient.invalidateQueries({ queryKey: ["weekly-pattern"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["monthly-trend"] });
        toast.success("Selected transaction(s) deleted!");
      } 
      else if(action === "LIST_DB") {
        // console.log("List DB action received with filters:", dbQueryFilters);
        addMessage({
          sender: "assistant",
          action: "LIST_DB",
          text: replyText,
          candidates: transactions && transactions.length > 0 ? transactions : undefined,
          status: transactions && transactions.length > 0 ? "dismissed" : undefined,
        });
        const assistantReply = transactions && transactions.length > 0
          ? `${replyText} Here are the details: ${transactions.map((tx: CandidateTransaction) => `- ID:${tx.id} - ${tx.type} of ₹${tx.amount} in category "${tx.category}" on ${tx.date}`).join("\n")}`
          : replyText;
        setLastAssistantMessage(assistantReply);
      }
      else {
        // GENERAL / Fallbacks
        // console.log("General response received.");
        addMessage({
          sender: "assistant",
          text: replyText,
          action: "GENERAL",
        })
      }
    } catch (err: any) {
      console.log("Error processing assistant message:", err);
      addMessage({
        sender: "assistant",
        action: "GENERAL",
        text: "Sorry, something went wrong while processing your request. Please try again after some time.",
      })
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