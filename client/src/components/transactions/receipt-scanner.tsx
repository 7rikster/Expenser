"use client"

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UseMutateAsyncFunction } from "@tanstack/react-query";

type ReceiptScannerProps = {
    onScanComplete: (scannedData: any) => void;
    uploadReceipt: UseMutateAsyncFunction<any, Error, FormData, unknown>;
    isUploading: boolean;
    isNaturalLanguageExtracting: boolean;
}

const ReceiptScanner = ({onScanComplete, uploadReceipt, isUploading, isNaturalLanguageExtracting}: ReceiptScannerProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);


    const handleReceiptScan = async(file:File) => {
        if(file.size > 5*1024*1024){
            toast.error("File size should be less than 5MB");
            return;
        }
        try {
            const formData = new FormData();
            formData.append("receipt",file);
            const data = await uploadReceipt(formData);
            onScanComplete(data);
            toast.success("Receipt scanned successfully");

        } catch (error) {
            toast.error("Failed to scan receipt");
        }
    }


    return (
        <div>
            <input 
                type="file"  
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment"
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        handleReceiptScan(file);
                    }
                }}
            />
            <Button
            type="button"
            variant="outline"
            className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hover:text-white cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isNaturalLanguageExtracting}
            >
                {isUploading?<> <Loader2 className="mr-2 h-4 w-4 animate-spin text-white"/><span>Scanning Receipt...</span></>:<><Camera className="mr-2"/><span>Scan Receipt with AI</span></>}
                
            </Button>
        </div>
    )
}

export default ReceiptScanner