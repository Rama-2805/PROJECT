"use client";

import { useUIStore } from "@/store/uiStore";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  CheckSquare, 
  ScanFace, 
  Bell, 
  User,
  ChevronLeft,
  ChevronRight,
  Cloud
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/dashboard/attendance", label: "Attendance", icon: CheckSquare },
  { href: "/student/dashboard/face-profile", label: "Face Profile", icon: ScanFace },
  { href: "/student/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/student/dashboard/profile", label: "Profile", icon: User },
];

export function StudentSidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const pathname = usePathname();

  return (
    <motion.aside
      layout
      initial={false}
      animate={{
        width: sidebarOpen ? 280 : 80,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-full z-50 flex flex-col border-r border-glass-border bg-bg-secondary/90 backdrop-blur-[40px] shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-colors duration-300"
    >
      {/* Header Logo */}
      <div className="flex h-20 items-center justify-between px-6 border-b border-glass-border">
        <Link href="/" className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <Cloud className="w-8 h-8 text-text-primary fill-text-primary shrink-0 transition-colors" />
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-[1.15rem] font-medium text-text-primary leading-none tracking-tight transition-colors">SMARTCAMPUS</span>
              <span className="text-[0.55rem] font-semibold text-text-muted uppercase tracking-widest mt-0.5 transition-colors">Student Portal</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2.5 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex items-center gap-4 rounded-xl px-3.5 py-3 transition-all duration-300 group cursor-pointer",
                  isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {/* Active Glass Capsule Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavCapsule"
                    className="absolute inset-0 rounded-xl bg-glass-heavy border border-glass-border shadow-glass pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Subtle Hover Backlight (only when not active) */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl bg-text-primary/[0.02] border border-transparent group-hover:bg-text-primary/[0.04] group-hover:border-glass-border transition-all duration-300 pointer-events-none" />
                )}
                
                <item.icon 
                  className={cn(
                    "h-5 w-5 shrink-0 transition-all duration-350", 
                    isActive 
                      ? "text-text-primary filter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" 
                      : "text-text-secondary group-hover:text-text-primary group-hover:scale-110"
                  )} 
                />
                
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "font-medium whitespace-nowrap z-10 transition-colors duration-300",
                      isActive ? "text-text-primary font-semibold" : "text-text-secondary group-hover:text-text-primary"
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}

                {/* Hover Tooltip when collapsed */}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-4 rounded-lg bg-bg-secondary border border-glass-border px-3 py-1.5 text-xs text-text-primary opacity-0 shadow-glass scale-95 origin-left transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <div className="p-4 border-t border-glass-border flex justify-center bg-bg-primary/10">
        <button
          onClick={toggleSidebar}
          className="flex h-10 w-full items-center justify-center rounded-xl bg-glass-light border border-glass-border text-text-secondary hover:bg-glass-heavy hover:text-text-primary hover:border-glass-border transition-all shadow-glass"
        >
          {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>
    </motion.aside>
  );
}
