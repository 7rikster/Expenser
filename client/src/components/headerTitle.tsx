"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const TITLE_MAP: Record<string, string> = {
  dashboard: "Welcome",
  transactions: "Transactions",
  reports: "Reports",
  goals: "Goals",
  subscriptions: "Subscriptions",
  "ai-assistant": "AI Assistant",
};

export default function HeaderTitle() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  const segment = pathname.split("/").filter(Boolean).pop();
  const baseTitle = TITLE_MAP[segment ?? ""] ?? "Dashboard";

  // Dashboard-specific welcome message
  if (segment === "dashboard" && isLoaded && user) {
    const name =
      user.firstName ||
      user.fullName ||
      "there";

    return (
      <h1 className="text-xl font-semibold text-foreground">
        Welcome, <span className="capitalize">{name}</span>
      </h1>
    );
  }

  return (
    <h1 className="text-xl font-semibold text-foreground">
      {baseTitle}
    </h1>
  );
}
