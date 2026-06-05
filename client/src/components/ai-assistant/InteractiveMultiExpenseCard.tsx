"use client";
import { Trash2, Check, AlertCircle, Loader2 } from "lucide-react";
import { CandidateTransaction, useAssistantStore } from "@/store/assistant-store";
import { useBulkCreateTransactions } from "@/hooks/use-assistant";
import { toast } from "sonner";
import { defaultCategories } from "@/lib/data";

interface InteractiveMultiExpenseCardProps {
  messageId: string;
  candidates: CandidateTransaction[];
  status: "pending" | "approved" | "dismissed";
}

const CATEGORIES = defaultCategories;

export default function InteractiveMultiExpenseCard({
    messageId,
    candidates,
    status
}: InteractiveMultiExpenseCardProps) {

    const { updateMessageStatus, updateCandidate, removeCandidate, isProcessing } = useAssistantStore();
    const { mutateAsync: bulkCreateMutation, isPending } = useBulkCreateTransactions(); 

    if (status === "dismissed" || candidates.length === 0) {
        return (
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 text-center text-sm text-zinc-400">
            Transactions dismissed or removed.
        </div>
        );
    }
    if (status === "approved") {
        return (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <div className="flex items-center gap-2 mb-2 font-medium">
            <Check className="w-5 h-5" />
            <span>Successfully Logged {candidates.length} Item(s)</span>
            </div>
            <ul className="text-xs space-y-1 pl-7 list-disc">
            {candidates.map((c) => (
                <li key={c.id}>
                <span className="font-semibold capitalize">[{c.type.toLowerCase()}]</span> {c.merchantName}: Rs. {Number(c.amount).toFixed(2)} on {c.date} ({c.category})
                </li>
            ))}
            </ul>
        </div>
        );
    }
    const handleApproveAll = async () => {
        // Validate amounts
        const hasInvalid = candidates.some((c) => isNaN(c.amount) || c.amount <= 0);
        if (hasInvalid) {
        toast.error("Please enter valid amounts and names for all transactions.");
        return;
        }
        try {
        // Strip frontend local ids prior to API delivery
        const payload = candidates.map(({ amount, date, description, merchantName, category, type }) => ({
            amount,
            date,
            description,
            merchantName,
            category,
            type,
        }));
        await bulkCreateMutation(payload);
        updateMessageStatus(messageId, "approved");
        toast.success("All approved transactions logged successfully!");
        } catch (err: any) {
        toast.error(err.message || "Failed to log transactions");
        }
    };
    return (
        <div className="w-full space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Extracted Transactions ({candidates.length})
            </span>
            <button
            onClick={() => updateMessageStatus(messageId, "dismissed")}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
            Dismiss
            </button>
        </div>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {candidates.map((c) => {
            const isInvalid = isNaN(c.amount) || c.amount <= 0;
            return (
                <div
                key={c.id}
                className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-2 relative group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                {/* Individual Trash Button */}
                <button
                    onClick={() => removeCandidate(messageId, c.id)}
                    className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 hover:scale-110 transition-all p-1 rounded-md hover:bg-red-500/10"
                    title="Remove transaction"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                {/* Type Selection Badges */}
                <div className="flex gap-2">
                    <button
                    onClick={() => updateCandidate(messageId, c.id, { type: "EXPENSE" })}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        c.type === "EXPENSE"
                        ? "bg-red-500/20 text-red-500 border border-red-500/30"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    }`}
                    >
                    EXPENSE
                    </button>
                    <button
                    onClick={() => updateCandidate(messageId, c.id, { type: "INCOME" })}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        c.type === "INCOME"
                        ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    }`}
                    >
                    INCOME
                    </button>
                </div>
                {/* Editable Fields Form Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Merchant Name */}
                    <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-400">Merchant/Sender</label>
                    <input
                        type="text"
                        value={c.merchantName}
                        onChange={(e) => updateCandidate(messageId, c.id, { merchantName: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                    />
                    </div>
                    {/* Amount */}
                    <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-400 flex items-center justify-between">
                        Amount {isInvalid && <AlertCircle className="w-3 h-3 text-red-500 inline" />}
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={c.amount || ""}
                        onChange={(e) => updateCandidate(messageId, c.id, { amount: parseFloat(e.target.value) || 0 })}
                        className={`w-full bg-white dark:bg-zinc-950 border rounded px-2 py-1 focus:ring-1 focus:ring-violet-500 focus:outline-none ${
                        isInvalid ? "border-red-500 focus:ring-red-500" : "border-zinc-200 dark:border-zinc-800"
                        }`}
                    />
                    </div>
                    {/* Date */}
                    <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-400">Date</label>
                    <input
                        type="date"
                        value={c.date.slice(0, 10)}
                        onChange={(e) => updateCandidate(messageId, c.id, { date: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                    />
                    </div>
                    {/* Category Dropdown */}
                    <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-zinc-400">Category</label>
                    <select
                        value={c.category}
                        onChange={(e) => updateCandidate(messageId, c.id, { category: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 focus:ring-1 focus:ring-violet-500 focus:outline-none capitalize text-xs"
                    >
                        {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                        ))}
                    </select>
                    </div>
                </div>
                {/* Description (Optional notes) */}
                <div className="flex flex-col gap-1 text-xs">
                    <label className="text-[10px] text-zinc-400">Description / Memo</label>
                    <input
                    type="text"
                    value={c.description}
                    onChange={(e) => updateCandidate(messageId, c.id, { description: e.target.value })}
                    placeholder="No description provided"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                    />
                </div>
                </div>
            );
            })}
        </div>
        {/* Bulk Approval Button */}
        <button
            onClick={handleApproveAll}
            disabled={isPending || isProcessing}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2 text-xs font-semibold shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
            {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin text-white"/> Logging transactions...</>
            ) : (
            <>Approve & Log {candidates.length} Transactions</>
            )}
        </button>
        </div>
    );

}