"use client";

import React, { useState, useEffect } from "react";
import { useUIStore } from "@/store/uiStore";
import { TopNavbar } from "../../dashboard/layout/TopNavbar";
import { StudentSidebar } from "./StudentSidebar";
import { CommandPalette } from "../../dashboard/CommandPalette";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export function StudentClientWrapper({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const theme = useUIStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

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

      {/* Student Sidebar */}
      <StudentSidebar />

      {/* Main Content Area */}
      <motion.div
        layout
        className="flex flex-col flex-1 h-full relative z-10"
        initial={false}
        animate={{
          marginLeft: sidebarOpen ? "280px" : "80px",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <TopNavbar />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth relative z-10">
          {children}
        </main>
      </motion.div>

      {/* Global Modals & Panels */}
      <CommandPalette />
      
    </div>
  );
}
