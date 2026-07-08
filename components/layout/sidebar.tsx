"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@prisma/client";
import {
  CalendarDays,
  LayoutDashboard,
  Upload,
  Users,
  Building2,
  GraduationCap,
  DoorOpen,
  ClipboardCheck,
  Bell,
  BarChart3,
  Settings,
  X,
  Clock,
  BookOpen,
  Link2,
  PieChart,
  Calendar,
  HardDrive,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";

interface SidebarProps {
  user: {
    role: Role;
    name: string;
    departmentCode: string | null;
  };
}

const navigationItems = {
  ADMIN: [
    {
      title: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: "Timetables",
      href: "/admin/timetables",
      icon: CalendarDays,
    },
    {
      title: "Sections",
      href: "/admin/sections",
      icon: GraduationCap,
    },
    {
      title: "Rooms",
      href: "/admin/rooms",
      icon: DoorOpen,
    },
    {
      title: "Upload",
      href: "/admin/upload",
      icon: Upload,
    },
    {
      title: "Departments",
      href: "/admin/departments",
      icon: Building2,
    },
    {
      title: "Buildings",
      href: "/admin/buildings",
      icon: Building2,
    },
    {
      title: "Sessions",
      href: "/admin/sessions",
      icon: Calendar,
    },
    {
      title: "Section Hours",
      href: "/admin/section-hours",
      icon: Clock,
    },
    {
      title: "Free Slots",
      href: "/admin/free-slots",
      icon: CalendarDays,
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: PieChart,
    },
    {
      title: "Backup & Restore",
      href: "/admin/backup",
      icon: HardDrive,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ],
  COORDINATOR: [
    {
      title: "Dashboard",
      href: "/coordinator",
      icon: LayoutDashboard,
    },
    {
      title: "Room Timetables",
      href: "/coordinator/rooms",
      icon: DoorOpen,
    },
    {
      title: "Section Timetables",
      href: "/coordinator/sections",
      icon: GraduationCap,
    },
    {
      title: "Subjects",
      href: "/coordinator/subjects",
      icon: BookOpen,
    },
    {
      title: "Faculty",
      href: "/coordinator/faculties",
      icon: Users,
    },
    {
      title: "Faculty Mappings",
      href: "/coordinator/mappings",
      icon: Link2,
    },
    {
      title: "My Requests",
      href: "/coordinator/requests",
      icon: ClipboardCheck,
    },
    {
      title: "Pending Approvals",
      href: "/coordinator/approvals",
      icon: Bell,
    },
    {
      title: "User Manual",
      href: "/coordinator/manual",
      icon: HelpCircle,
    },
  ],
  HOD: [
    {
      title: "Dashboard",
      href: "/hod",
      icon: LayoutDashboard,
    },
    {
      title: "Room Timetables",
      href: "/hod/rooms",
      icon: DoorOpen,
    },
    {
      title: "Section Timetables",
      href: "/hod/sections",
      icon: GraduationCap,
    },
    {
      title: "Analytics",
      href: "/hod/analytics",
      icon: PieChart,
    },
    {
      title: "Statistics",
      href: "/hod/statistics",
      icon: BarChart3,
    },
  ],
};

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const items = navigationItems[user.role] || [];

  // Close sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-4 px-5 py-6 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-500/30">
            <CalendarDays className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">BMSCE</span>
          <span className="text-xs text-muted-foreground font-medium">Centralized Timetable</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== `/${user.role.toLowerCase()}` && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User Info */}
      <div className="p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.role} {user.departmentCode && `• ${user.departmentCode}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col border-r bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Toggle Button (handled in header) */}

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r bg-card lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
