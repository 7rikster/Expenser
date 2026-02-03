import { requireUnAuth } from "@/module/auth/utils/auth-utils";
import React from "react";

const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
  await requireUnAuth();
  return <main className="flex-1 overflow-auto">{children}</main>;
};

export default AuthLayout;
