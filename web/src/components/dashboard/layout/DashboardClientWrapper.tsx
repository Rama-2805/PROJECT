"use client";

import React, { useState, useEffect } from "react";
import { useUIStore } from "@/store/uiStore";
import { TopNavbar } from "./TopNavbar";
import { GlassSidebar } from "./GlassSidebar";
import { CommandPalette } from "../CommandPalette";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";

export function DashboardClientWrapper({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    // Detect if page was refreshed/reloaded
    const navEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';
    const isReloadLegacy = window.performance && window.performance.navigation && window.performance.navigation.type === 1;

    if (isReload || isReloadLegacy) {
      setShowExpiredModal(true);
    }
  }, []);

  // 1-minute inactivity (idle) timer
  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;

    const resetIdleTimer = () => {
      if (showExpiredModal) return;
      clearTimeout(idleTimeout);
      
      // 1 minute = 60,000 milliseconds
      idleTimeout = setTimeout(() => {
        setShowExpiredModal(true);
      }, 60000);
    };

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // Start timer on mount
    resetIdleTimer();

    // Reset timer on user activity
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });

    return () => {
      clearTimeout(idleTimeout);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [showExpiredModal]);

  const handleBackToHome = async () => {
    // Clear NextAuth session and local cookies
    await signOut({ redirect: false });
    document.cookie = "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/";
  };

  const handleLoginAgain = async () => {
    // Clear NextAuth session and local cookies
    await signOut({ redirect: false });
    document.cookie = "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <GlassSidebar />

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
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          {children}
        </main>
      </motion.div>

      {/* Global Modals & Panels */}
      <CommandPalette />
      
      {/* Login Expired Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden"
          >
            {/* Top accent glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-red-500/40 blur-sm" />
            
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight">Login Expired</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              For security, your session has expired or the page was refreshed. Please log in again to access the campus operating system.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBackToHome}
                className="flex-1 border border-white/10 hover:border-white/20 hover:bg-white/5 text-white py-3 rounded-xl font-medium transition-all text-sm cursor-pointer"
              >
                Back to Home
              </button>
              <button
                onClick={handleLoginAgain}
                className="flex-1 bg-white hover:bg-gray-200 text-black py-3 rounded-xl font-semibold transition-all text-sm shadow-[0_4px_12px_rgba(255,255,255,0.1)] cursor-pointer"
              >
                Login
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
