import { requireAuth } from "@/module/auth/utils/auth-utils";

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  await requireAuth();
  return <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>;
};

export default DashboardLayout;
