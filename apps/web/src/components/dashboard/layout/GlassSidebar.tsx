"use client";

import { useUIStore } from "@/store/uiStore";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckSquare, 
  Cpu, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Activity,
  ScanFace,
  LogOut,
  X,
  ShieldCheck,
  FileText,
  Radio,
  Boxes,
  Layers,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/store/auth";

const ALL_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ALL"] },
  { href: "/dashboard/students", label: "Students", icon: Users, roles: ["ADMIN", "HOD"] },
  { href: "/dashboard/teachers", label: "Teachers", icon: GraduationCap, roles: ["ADMIN", "HOD"] },
  { href: "/dashboard/hod", label: "HODs", icon: ShieldCheck, roles: ["ADMIN", "HOD"] },
  { href: "/dashboard/departments", label: "Departments", icon: Layers, roles: ["ADMIN"] },
  { href: "/dashboard/courses", label: "Courses", icon: BookOpen, roles: ["ADMIN", "HOD"] },
  { href: "/dashboard/classrooms", label: "Classes", icon: BookOpen, roles: ["ADMIN", "HOD"] },
  { href: "/dashboard/attendance", label: "Attendance", icon: CheckSquare, roles: ["ALL"] },
  { href: "/dashboard/live-monitoring", label: "Live Monitoring", icon: Activity, roles: ["ALL"] },
  { href: "/dashboard/behavior-analytics", label: "Behavior AI", icon: Eye, roles: ["ADMIN", "HOD"] },
  { href: "/dashboard/face-enrollment", label: "AI Enrollment", icon: ScanFace, roles: ["ADMIN"] },
  { href: "/dashboard/reports", label: "Reports", icon: FileText, roles: ["ADMIN", "HOD"] },
  { href: "/dashboard/devices", label: "IoT Devices", icon: Radio, roles: ["ADMIN"] },
  { href: "/dashboard/digital-twin", label: "Digital Twin", icon: Boxes, roles: ["ADMIN"] },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, roles: ["ALL"] },
  { href: "/dashboard/system", label: "System Health", icon: Cpu, roles: ["ADMIN"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["ALL"] },
];

export function GlassSidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const isHod = user?.roles?.includes("HOD");
  const isAdmin =
    user?.roles?.some((r) =>
      [
        "SUPER_ADMIN",
        "INSTITUTION_ADMIN",
        "COLLEGE_SUPER_ADMIN",
        "COLLEGE_ADMIN",
        "DEVICE_MANAGER",
        "RESEARCH_ANALYST",
      ].includes(r),
    ) ?? true;

  const navItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.roles.includes("ALL")) return true;
      if (item.roles.includes("ADMIN") && isAdmin) return true;
      if (item.roles.includes("HOD") && (isHod || isAdmin)) return true;
      return false;
    });
  }, [isAdmin, isHod]);

  // Close drawer on Escape key when on mobile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  return (
    <motion.aside
      layout
      initial={false}
      animate={
        isMobile
          ? {
              x: sidebarOpen ? 0 : -320,
              width: 280,
            }
          : {
              x: 0,
              width: sidebarOpen ? 280 : 80,
            }
      }
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed left-0 top-0 h-full z-50 flex flex-col border-r border-glass-border bg-bg-secondary/95 backdrop-blur-[40px] shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-colors duration-300 max-w-[85vw]",
        isMobile && !sidebarOpen && "pointer-events-none"
      )}
    >
      {/* Header Logo */}
      <div className="flex h-20 items-center justify-between px-6 border-b border-glass-border">
        <Link 
          href="/" 
          onClick={() => { if (isMobile) setSidebarOpen(false); }}
          className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
        >
          <Cloud className="w-8 h-8 text-text-primary fill-text-primary shrink-0 transition-colors" />
          {(sidebarOpen || isMobile) && (
            <div className="flex flex-col">
              <span className="text-[1.15rem] font-medium text-text-primary leading-none tracking-tight transition-colors">SMARTCAMPUS</span>
              <span className="text-[0.55rem] font-semibold text-text-muted uppercase tracking-widest mt-0.5 transition-colors">Intelligent Education</span>
            </div>
          )}
        </Link>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-glass-medium transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2.5 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={() => {
                if (isMobile) setSidebarOpen(false);
              }}
            >
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
                
                {(sidebarOpen || isMobile) && (
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

                {/* Hover Tooltip when collapsed on desktop */}
                {!sidebarOpen && !isMobile && (
                  <div className="absolute left-full ml-4 rounded-lg bg-bg-secondary border border-glass-border px-3 py-1.5 text-xs text-text-primary opacity-0 shadow-glass scale-95 origin-left transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}

        {/* Explicit Sign Out item */}
        <Link 
          href="#"
          onClick={async (e) => {
            e.preventDefault();
            if (isMobile) setSidebarOpen(false);
            await useAuthStore.getState().logout();
            window.location.href = "/";
          }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative flex items-center gap-4 rounded-xl px-3.5 py-3 transition-all duration-300 group cursor-pointer text-red-400 hover:text-red-300"
          >
            <div className="absolute inset-0 rounded-xl bg-text-primary/[0.02] border border-transparent group-hover:bg-text-primary/[0.04] group-hover:border-glass-border transition-all duration-300 pointer-events-none" />
            <LogOut className="h-5 w-5 shrink-0 text-red-400 group-hover:scale-110 transition-all duration-350" />
            {(sidebarOpen || isMobile) && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-medium whitespace-nowrap z-10 text-red-400 group-hover:text-red-300"
              >
                Sign Out
              </motion.span>
            )}
            {!sidebarOpen && !isMobile && (
              <div className="absolute left-full ml-4 rounded-lg bg-bg-secondary border border-glass-border px-3 py-1.5 text-xs text-red-400 opacity-0 shadow-glass scale-95 origin-left transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 pointer-events-none whitespace-nowrap z-50">
                Sign Out
              </div>
            )}
          </motion.div>
        </Link>
      </nav>

      {/* Toggle Button - Desktop Only */}
      <div className="hidden lg:flex p-4 border-t border-glass-border justify-center bg-bg-primary/10">
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
