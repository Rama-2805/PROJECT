"use client";

import { useUIStore } from "@/store/uiStore";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckSquare, 
  Cpu, 
  BarChart3, 
  BrainCircuit, 
  Box, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Students", icon: Users },
  { href: "/dashboard/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/dashboard/classrooms", label: "Classes", icon: BookOpen },
  { href: "/dashboard/attendance", label: "Attendance", icon: CheckSquare },
  { href: "/dashboard/devices", label: "Devices", icon: Cpu },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/ai-brain", label: "AI Brain", icon: BrainCircuit },
  { href: "/dashboard/digital-twin", label: "Digital Twin", icon: Box },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function GlassSidebar() {
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
      className="fixed left-0 top-0 h-full z-50 flex flex-col border-r border-white/10 bg-[#060814]/85 backdrop-blur-[40px] shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
    >
      {/* Header Logo */}
      <div className="flex h-20 items-center justify-between px-6 border-b border-white/10">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <BrainCircuit className="h-5 w-5" />
          </div>
          {sidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-semibold tracking-wider bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent"
            >
              SmartCampus AI
            </motion.span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2.5 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex items-center gap-4 rounded-xl px-3.5 py-3 transition-all duration-300 group cursor-pointer",
                  isActive ? "text-white" : "text-gray-400 hover:text-white"
                )}
              >
                {/* Active Glass Capsule Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavCapsule"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/15 via-blue-500/5 to-transparent border border-blue-500/25 shadow-[0_0_25px_rgba(59,130,246,0.15),inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Subtle Hover Backlight (only when not active) */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl bg-white/[0.02] border border-white/0 opacity-0 group-hover:opacity-100 group-hover:border-white/5 transition-all duration-300 pointer-events-none" />
                )}
                
                <item.icon 
                  className={cn(
                    "h-5 w-5 shrink-0 transition-all duration-350", 
                    isActive 
                      ? "text-blue-400 filter drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" 
                      : "group-hover:text-blue-300 group-hover:scale-110"
                  )} 
                />
                
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "font-medium whitespace-nowrap z-10 transition-colors duration-300",
                      isActive ? "text-white font-semibold" : "text-gray-400 group-hover:text-white"
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}

                {/* Hover Tooltip when collapsed */}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-4 rounded-lg bg-[#0d0f1a] border border-white/10 px-3 py-1.5 text-xs text-white opacity-0 shadow-xl scale-95 origin-left transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Toggle Button */}
      <div className="p-4 border-t border-white/10 flex justify-center bg-black/10">
        <button
          onClick={toggleSidebar}
          className="flex h-10 w-full items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
        >
          {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>
    </motion.aside>
  );
}
