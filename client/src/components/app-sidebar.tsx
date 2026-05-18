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
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

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
  const userEmail = user.emailAddresses?.[0]?.emailAddress || "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar collapsible="icon">
      

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
      <SidebarFooter className="border-t px-1 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-12 px-2 rounded-lg data-[state=open]:bg-sidebar-accent data-[state=open]
                                :text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
                >
                  <Avatar className="h-10 w-10 rounded-lg shrink-0">
                    <AvatarImage
                      src={user.imageUrl || "/placeholder.svg"}
                      alt={userName}
                    />
                    <AvatarFallback className="rounded-lg">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-relaxed min-w-0">
                    <span className="truncate font-semibold text-base ">
                      {userName}
                    </span>
                    <span className="truncate text-xs ">
                      {userEmail}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-80 rounded-lg"
                side="right"
                align="end"
                sideOffset={8}
              >
                <div className="flex items-center gap-3 px-4 py-4 bg-sidebar-accent/30 rounded-t-lg">
                  <Avatar className="h-12 w-12 rounded-full shrink-0">
                    <AvatarImage
                      src={user.imageUrl || "/placeholder.svg"}
                      alt={userName}
                    />
                    <AvatarFallback className="rounded-lg">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-relaxed min-w-0">
                    <span className="truncate font-semibold text-base">
                      {userName}
                    </span>
                    <span className="truncate text-xs ">
                      {userEmail}
                    </span>
                  </div>
                </div>
                <div>
                  <DropdownMenuItem
                    className="px-3 cursor-pointer"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    {theme === "dark" ? (
                      <Sun className="mr-1 h-4 w-4" />
                    ) : (
                      <Moon className="mr-1 h-4 w-4" />
                    )}
                    <span>{theme === "dark" ? "Light" : "Dark"} Mode</span>
                  </DropdownMenuItem>
                </div>
                <SidebarSeparator />
                <DropdownMenuItem className="cursor-pointer px-3 ">
                  <SignOutButton redirectUrl="/sign-in">
                    <div className="flex">
                      <LogOut className="mr-3 h-4 w-4" />
                      <span>Log out</span>
                    </div>
                  </SignOutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
