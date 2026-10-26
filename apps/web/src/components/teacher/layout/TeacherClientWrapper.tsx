"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useUIStore } from "@/store/uiStore";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { usePathname } from "next/navigation";
import { TopNavbar } from "../../dashboard/layout/TopNavbar";
import { TeacherSidebar } from "./TeacherSidebar";
import { CommandPalette } from "../../dashboard/CommandPalette";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";
import { useAuthStore } from "@/lib/store/auth";

export function TeacherClientWrapper({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const theme = useUIStore((s) => s.theme);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("teacher-intro-shown");
  });

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile, setSidebarOpen]);

  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Enforce teacher role guard
  useEffect(() => {
    if (isLoading) return;
    if (user) {
      const roles = user.roles || [];
      const isStudent = roles.includes("STUDENT");
      const isTeacher = roles.includes("TEACHER");
      const isHod = roles.includes("HOD");
      const isAdmin = roles.some((r) =>
        ["SUPER_ADMIN", "INSTITUTION_ADMIN", "COLLEGE_SUPER_ADMIN", "COLLEGE_ADMIN"].includes(r),
      );

      if (isStudent && !isAdmin && !isTeacher && !isHod) {
        window.location.href = "/student/dashboard";
      }
    }
  }, [user, isLoading]);

  // Synchronize theme with documentElement to resolve global CSS variables correctly
  useEffect(() => {
    if (!mounted) return;

    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }

    return () => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    };
  }, [theme, mounted]);

  const activeTheme = mounted ? theme : "dark";

  return (
    <div className={cn("relative flex h-screen w-full overflow-hidden bg-bg-primary text-text-primary transition-colors duration-300", activeTheme)}>
      {/* Background Subtle Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[80vw] h-[80vw] border border-text-primary/5 rounded-full absolute transition-all duration-300" />
        <div className="w-[60vw] h-[60vw] border border-text-primary/5 rounded-full absolute transition-all duration-300" />
        <div className="w-[40vw] h-[40vw] border border-text-primary/5 rounded-full absolute transition-all duration-300" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.02] light:opacity-[0.05]" />
      </div>

      {/* Sidebar */}
      <TeacherSidebar />

      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            key="mobile-teacher-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <motion.div
        layout
        className="flex flex-col flex-1 h-full relative z-10 min-w-0"
        initial={false}
        animate={{
          marginLeft: isMobile ? "0px" : (sidebarOpen ? "280px" : "80px"),
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <TopNavbar />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth relative z-10 w-full max-w-full">
          {children}
        </main>
      </motion.div>

      {/* Global Modals & Panels */}
      <CommandPalette />
      
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060814] px-6"
          >
            <div className="w-full max-w-md flex flex-col items-center gap-6">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex items-center gap-2 mb-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1d6ffb] to-[#74e1ff] flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-sm">S</span>
                </div>
                <span className="text-white font-extrabold tracking-wider text-xl uppercase text-white">SmartCampus AI</span>
              </motion.div>
              
              <ProgressiveFluxLoader
                duration={2.5}
                loop={false}
                phases={[
                  { at: 0, label: "Connecting to Core..." },
                  { at: 30, label: "Verifying Session..." },
                  { at: 60, label: "Fetching Roles..." },
                  { at: 90, label: "Structuring Dashboard..." },
                  { at: 100, label: "Ready" }
                ]}
                onComplete={() => {
                  sessionStorage.setItem("teacher-intro-shown", "true");
                  setShowIntro(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
