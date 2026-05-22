"use client";

import React, { useRef } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useMediaQuery } from "usehooks-ts";

interface InputTrayProps {
  inputText: string;
  setInputText: (text: string) => void;
  selectedFile: File | null;
  filePreview: string;
  isProcessing: boolean;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  onSubmit: () => void;
}

export default function InputTray({
  inputText,
  setInputText,
  selectedFile,
  filePreview,
  isProcessing,
  onFileSelect,
  onFileRemove,
  onSubmit,
}: InputTrayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file (PNG/JPG)");
        e.target.value = "";
        return;
      }
      onFileSelect(file);
      e.target.value = "";
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || isProcessing) return;
    onSubmit();
  };
  const isSmallScreen = useMediaQuery("(max-width: 639px)");

  return (
    <form 
      onSubmit={handleFormSubmit}
      className=" bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 relative shadow-lg shrink-0"
    >
      {filePreview && (
        <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl mb-2 w-max relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={filePreview} 
            alt="Upload thumbnail" 
            className="w-12 h-12 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700" 
          />
          <div className="text-[10px] text-left pr-4">
            <p className="font-semibold max-w-[120px] truncate text-zinc-700 dark:text-zinc-300">
              {selectedFile?.name}
            </p>
            <p className="text-zinc-400">
              {((selectedFile?.size || 0) / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onFileRemove();

              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-transform active:scale-90 cursor-pointer shadow-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
          title="Attach receipt"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (inputText.trim() || selectedFile) onSubmit();
            }
          }}
          placeholder={
                isSmallScreen
                ? "Type a message..."
                : "Type a message or drag/drop transaction images..."
            }
          rows={1}
          className="flex-1 max-h-[120px] bg-transparent resize-none border-0 text-sm focus:ring-0 focus:outline-none py-2 text-zinc-800 dark:text-zinc-100 overflow-y-auto"
        />

        <button
          type="submit"
          disabled={(!inputText.trim() && !selectedFile) || isProcessing}
          className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-100 dark:disabled:bg-zinc-900 text-white disabled:text-zinc-400 dark:disabled:text-zinc-700 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:pointer-events-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}