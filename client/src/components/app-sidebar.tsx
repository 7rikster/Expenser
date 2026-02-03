"use client";

import { Github, BookOpen, Settings, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export const AppSidebar = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { user: session, isLoaded } = useUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigationItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: BookOpen,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: Github,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BookOpen,
    },
    {
      title: "AI Assistant",
      url: "/ai-assistant",
      icon: BookOpen,
    },
    {
      title: "Goals",
      url: "/goals",
      icon: Settings,
    },
    {
      title: "Subscriptions",
      url: "/subscriptions",
      icon: Settings,
    },
  ];

  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(url + "/dashboard");
  };

  if (!session || !mounted) {
    return null;
  }

  const user = session;
  const userName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex flex-col gap-4 px-2 py-6">
          <div
            className={cn(
              "flex items-center gap-4 px-3 py-4 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent/70 transition-all",
              "group-data-[collapsible=icon]:justify-center",
              "group-data-[collapsible=icon]:px-0",
              "group-data-[collapsible=icon]:bg-sidebar-accent/0",
              "group-data-[collapsible=icon]:hover:bg-sidebar-accent/0",
            )}
          >
            {/* Avatar / Icon */}
            {/* <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white text-primary-foreground shrink-0"> */}
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-20 h-20 ", // outer avatar size
                  userButtonAvatarBox: "w-20 h-20",
                },
              }}
            />
            {/* </div> */}

            {/* Text content */}
            <div
              className={cn(
                "flex-1 min-w-0 transition-all",
                "group-data-[collapsible=icon]:hidden",
              )}
            >
              <p className="text-sm font-medium text-sidebar-foreground/90">
                @{userName}
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6 flex-col gap-1 ">
        <div className="mb-2 group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-semibold text-sidebar-foreground/60 px-3 mb-3 uppercase tracking-widest">
            Menu
          </p>
        </div>
        <SidebarMenu className="gap-2">
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={`h-11 px-4 rounded-lg transition-all duration-200 ${
                  isActive(item.url)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "hover:bg-sidebar-accent/60 text-sidebar-foreground"
                }`}
              >
                <Link href={item.url} className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      {/* <SidebarFooter className="border-t px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div>Footer</div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter> */}
    </Sidebar>
  );
};
