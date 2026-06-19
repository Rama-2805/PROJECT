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
      
    </div>
  );
}
