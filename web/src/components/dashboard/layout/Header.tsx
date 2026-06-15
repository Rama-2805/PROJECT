"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

/* ─── Header Component ─────────────────────────────────────────── */
export interface HeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notifications = [
    { id: 1, text: "New AI model available", severity: "info", time: "5m ago" },
    { id: 2, text: "Device CAMERA_12 offline", severity: "warning", time: "15m ago" },
    { id: 3, text: "Recognition accuracy dropped", severity: "critical", time: "1h ago" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/5 backdrop-blur-[40px] saturate-200 border-b border-white/10 h-16">
      <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-2 text-xs text-text-muted">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && (
                    <svg className="w-3 h-3 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-text-secondary transition-colors">{crumb.label}</a>
                  ) : (
                    <span className="text-text-primary font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : (
            <h1 className="text-base font-semibold text-text-primary">{title}</h1>
          )}
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full group">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search students, classrooms, reports..."
              className="w-full h-9 pl-9 pr-3 rounded-lg text-xs bg-glass-light border border-glass-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ai-blue/40 transition-colors"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] bg-glass-heavy text-text-muted font-mono border border-glass-border hidden sm:inline-block">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* AI Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/10 border border-success/20">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-glow-pulse" />
            <span className="text-[10px] font-medium text-success">AI ACTIVE</span>
          </div>

          {/* Health */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-glass-light border border-glass-border">
            <span className="h-1.5 w-1.5 rounded-full bg-ai-blue" />
            <span className="text-[10px] font-medium text-text-dim">96%</span>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg glass hover:bg-glass-medium transition-colors"
              aria-label="Notifications"
            >
              <svg className="w-4 h-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-error text-[8px] font-bold text-white flex items-center justify-center">
                {notifications.length}
              </span>
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-full mt-2 w-72 glass-heavy border border-glass-border rounded-card p-3 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-text-primary">Notifications</span>
                    <button className="text-[10px] text-ai-blue hover:underline">Clear all</button>
                  </div>
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex gap-2.5 p-2 rounded-lg hover:bg-glass-light transition-colors">
                        <div className={cn(
                          "mt-0.5 h-2 w-2 rounded-full shrink-0",
                          n.severity === "critical" && "bg-error",
                          n.severity === "warning" && "bg-warning",
                          n.severity === "info" && "bg-ai-blue",
                        )} />
                        <div className="min-w-0">
                          <p className="text-xs text-text-primary">{n.text}</p>
                          <p className="text-[10px] text-text-muted">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 h-9 pl-2 pr-3 rounded-lg glass hover:bg-glass-medium transition-colors"
              aria-label="User menu"
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-ai-blue to-ai-purple flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">A</span>
              </div>
              <span className="hidden sm:block text-xs font-medium text-text-primary">Prof. Alex</span>
              <svg className="w-3 h-3 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-full mt-2 w-52 glass-heavy border border-glass-border rounded-card p-2 shadow-xl"
                >
                  {["Profile", "Settings", "Help", "Sign Out"].map((item) => (
                    <button
                      key={item}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
