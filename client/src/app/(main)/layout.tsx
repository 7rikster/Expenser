
import { requireAuth } from "@/module/auth/utils/auth-utils";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import HeaderTitle from "@/components/headerTitle";


const MainLayout = async ({ children }: { children: React.ReactNode }) => {
  await requireAuth();
  
  return (
    <div >
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <HeaderTitle />
        </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};

export default MainLayout;
