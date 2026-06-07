"use client"

import { useState } from "react";
import { Button } from "../ui/button";
import { Field, FieldGroup } from "../ui/field";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { UseMutateAsyncFunction } from "@tanstack/react-query";
import { ScannedData } from "@/lib/types";

type NaturalLanguageFormFillProps = {
    onScanComplete: (scannedData: ScannedData   ) => void;
    extractLanguage: UseMutateAsyncFunction<ScannedData, Error, { input: string; }, unknown>;
    isExtracting: boolean;
    isReceiptScanning: boolean;
}

function NaturalLanguageFormFill({ onScanComplete, extractLanguage, isExtracting, isReceiptScanning }: NaturalLanguageFormFillProps) {
    const [expenseDescription, setExpenseDescription] = useState(""); 

    const handleFill = async() => {
        if(!expenseDescription.trim()){
            return;
        }
        try {
            const data = await extractLanguage({ input: expenseDescription });
            console.log("Extracted Data:", data);
            onScanComplete(data);
            toast.success("Language extracted successfully");

        } catch (error) {
            toast.error("Failed to extract language");
        }
        // console.log("Extracting language for:", expenseDescription);
    };
    return ( 
        <div className="flex flex-col sm:flex-row gap-2 items-end">
            <FieldGroup>
                <Field>
                  <Label htmlFor="daily">
                    Describe your expense in natural language
                  </Label>
                  <Input
                    id="daily"
                    type="input"
                    value={expenseDescription}
                    placeholder="e.g., Lunch at Cafe for ₹250"
                    onChange={(event) =>
                      setExpenseDescription(event.target.value)
                    }
                    />
                </Field>
                
              </FieldGroup>
            <Button type="button" className="flex items-center justify-center cursor-pointer w-full sm:w-32 text-white text-center" disabled={isExtracting || isReceiptScanning} onClick={handleFill}>
                {isExtracting? <Loader2 className="h-4 w-4 animate-spin text-white"/>:<><img src="/magic-star.svg" />Fill with AI</>}
            </Button>
        </div>
     );
}

export default NaturalLanguageFormFill;