"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { SquarePen } from "lucide-react";
import Link from "next/link";

const TITLE_MAP: Record<string, string> = {
  dashboard: "Welcome",
  transactions: "Transactions",
  reports: "Reports",
  goals: "Goals",
  subscriptions: "Subscriptions",
  "ai-assistant": "AI Assistant",
  "add-expense": "Add Expense",
};

export default function HeaderTitle() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  const segment = pathname.split("/").filter(Boolean).pop();
  const baseTitle = TITLE_MAP[segment ?? ""] ?? "Dashboard";
  console.log("Current segment:", segment);

  // Dashboard-specific welcome message
  if (segment === "dashboard" && isLoaded && user) {
    const name = user.firstName || user.fullName || "there";

    return (
      <div className="flex justify-between w-full items-center">
        <h1 className="text-xl font-semibold text-foreground">
          Welcome, <span className="capitalize">{name}</span>
        </h1>
        <Link href="/transactions/add-expense">
          <Button className="text-white cursor-pointer flex items-center gap-2">
            <SquarePen />
            Add Expense
          </Button>
        </Link>
      </div>
    );
  }

  return <div className="flex justify-between w-full items-center">
        <h1 className="text-xl font-semibold text-foreground">
          {baseTitle}
        </h1>
        <Link href="/transactions/add-expense">
          <Button className="text-white cursor-pointer flex items-center gap-2">
            <SquarePen />
            Add Expense
          </Button>
        </Link>
      </div>
}
