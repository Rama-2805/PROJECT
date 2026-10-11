"use client";

import { useUIStore } from "@/store/uiStore";
import { Search, Bell, Sparkles, Moon, Sun, User, Command, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { useBehaviorAlerts } from "@/lib/hooks/useBehaviorAlerts";

export function TopNavbar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const toggleAssistant = useUIStore((s) => s.toggleAssistant);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const {
    alerts,
    unreadCount,
    sectionFilter,
    setSectionFilter,
    acknowledgeAlert,
    isTeacher,
    isHod,
    isAdmin,
  } = useBehaviorAlerts();

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate breadcrumbs from pathname
  const segments = pathname.split("/").filter(Boolean);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCommandPalette]);

  // Click outside dropdowns to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-3 sm:gap-x-6 border-b border-glass-border bg-bg-secondary/55 px-3 sm:px-6 lg:px-8 backdrop-blur-[20px] transition-colors duration-300">
      
      {/* Left: Mobile Menu Button & Breadcrumbs */}
      <div className="flex flex-1 items-center gap-x-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden flex items-center justify-center h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl text-text-primary hover:bg-glass-medium border border-glass-border shadow-glass transition-colors shrink-0 cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-text-muted tracking-wider uppercase overflow-x-auto no-scrollbar">
          {segments.map((segment, index) => (
            <div key={segment} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className={cn(
                "transition-all duration-300",
                index === segments.length - 1 
                  ? "text-text-primary font-bold bg-glass-heavy border border-glass-border px-2 sm:px-2.5 py-1 rounded-lg shadow-glass" 
                  : "text-text-muted hover:text-text-primary"
              )}>
                {segment.replace(/-/g, " ")}
              </span>
              {index < segments.length - 1 && <span className="text-text-muted/40">/</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Center: Search Trigger */}
      <div className="hidden flex-1 sm:flex justify-center">
        <button
          onClick={toggleCommandPalette}
          className="group flex w-full max-w-md items-center gap-3 rounded-xl border border-glass-border bg-glass-light px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-glass-medium hover:border-glass-border/35 transition-all duration-300 shadow-glass focus:outline-none"
        >
          <Search className="h-4 w-4 text-text-muted group-hover:text-text-primary transition-colors" />
          <span className="font-normal text-text-muted group-hover:text-text-muted/90 transition-colors">Search students, teachers, HODs, reports...</span>
          <kbd className="ml-auto hidden rounded-lg bg-bg-primary px-2 py-1 text-[10px] font-bold text-text-muted sm:block border border-glass-border shadow-glass group-hover:text-text-primary transition-colors">
            <span className="flex items-center gap-1"><Command className="w-2.5 h-2.5"/>K</span>
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-x-2 sm:gap-x-4 lg:gap-x-5 shrink-0">
        
        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative rounded-xl border border-glass-border bg-glass-light p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary hover:bg-glass-medium hover:border-glass-border/30 hover:text-text-primary transition-all shadow-glass group cursor-pointer"
            title="Real-time Behavioral & System Notifications"
          >
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse shadow-md">
                {unreadCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-500 border border-bg-primary"></span>
            )}
            <Bell className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </button>
          
          {isNotificationsOpen && (
            <div className="fixed sm:absolute right-4 sm:right-0 top-20 sm:top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-xl bg-bg-secondary/95 backdrop-blur-[45px] border border-glass-border p-3 shadow-2xl z-[100] text-xs transition-colors duration-300">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-glass-border">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-text-primary">Behavioral & Class Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {/* Section filter tabs for HOD / Admin */}
                {(isHod || isAdmin) && (
                  <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-lg border border-white/5">
                    {(["ALL", "A", "B"] as const).map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setSectionFilter(sec)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                          sectionFilter === sec
                            ? "bg-ai-blue text-black font-bold shadow-sm"
                            : "text-text-muted hover:text-text-primary",
                        )}
                      >
                        {sec === "ALL" ? "All" : `Sec ${sec}`}
                      </button>
                    ))}
                  </div>
                )}
                {isTeacher && !isHod && (
                  <span className="text-[10px] font-semibold text-ai-blue bg-ai-blue/10 px-2 py-0.5 rounded border border-ai-blue/20">
                    Section A
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <p className="text-xs">No active behavioral alerts</p>
                    <p className="text-[10px] text-text-dim mt-1">All monitored students are attentive and alert.</p>
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const isPhone = alert.title.includes("Phone") || alert.description?.includes("phone");
                    const isSleeping = alert.title.includes("Sleeping") || alert.title.includes("Inactive") || alert.description?.includes("sleeping");

                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          "p-2.5 rounded-xl transition-all border",
                          alert.severity === "CRITICAL"
                            ? "bg-red-500/10 border-red-500/30 hover:border-red-500/50"
                            : alert.severity === "WARNING"
                            ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50"
                            : "bg-glass-light border-glass-border hover:bg-glass-medium",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-base shrink-0">
                              {isPhone ? "📱" : isSleeping ? "💤" : "⚠️"}
                            </span>
                            <span
                              className={cn(
                                "font-bold text-[11px] truncate",
                                alert.severity === "CRITICAL"
                                  ? "text-red-400"
                                  : alert.severity === "WARNING"
                                  ? "text-amber-400"
                                  : "text-ai-blue",
                              )}
                            >
                              {alert.title}
                            </span>
                          </div>
                          <span className="text-[9px] text-text-muted shrink-0 font-mono">
                            {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {alert.description && (
                          <p className="text-text-secondary text-[11px] mt-1 leading-snug">
                            {alert.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            {alert.section && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-white/10 text-text-muted">
                                Section {alert.section}
                              </span>
                            )}
                            {alert.confidence > 0 && (
                              <span className="text-[9px] text-text-dim">
                                AI Conf: {(alert.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 hover:bg-white/20 text-text-primary transition-colors cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant Toggle */}
        <button 
          onClick={toggleAssistant}
          className="relative rounded-xl bg-gradient-to-br from-text-primary/10 via-text-primary/5 to-transparent p-2.5 text-text-primary border border-glass-border hover:border-glass-border/40 hover:text-text-primary transition-all shadow-glass hover:shadow-glow-blue hover:scale-105 group"
        >
          <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
        </button>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="rounded-xl border border-glass-border bg-glass-light p-2.5 text-text-secondary hover:bg-glass-medium hover:border-glass-border/30 hover:text-text-primary transition-all shadow-glass group"
          aria-label="Toggle theme"
        >
          {mounted && theme === "light" ? (
            <Sun className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* Separator */}
        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-glass-border" aria-hidden="true" />

        {/* User Avatar & Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-x-2 rounded-full p-0.5 hover:bg-glass-medium transition-all duration-300 border border-transparent hover:border-glass-border shadow-glass group"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-[1px]">
              <div className="h-full w-full rounded-full bg-bg-primary flex items-center justify-center border border-glass-border group-hover:bg-transparent transition-colors duration-300">
                <User className="h-4 w-4 text-text-secondary group-hover:text-text-primary" />
              </div>
            </div>
          </button>
          
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-bg-secondary/95 backdrop-blur-[40px] border border-glass-border p-2 shadow-2xl z-[100] text-text-primary">
              <Link 
                href="#" 
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  localStorage.removeItem("currentUserEmail");
                  localStorage.removeItem("user-role");
                  window.location.href = "/";
                }}
                className="block w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold text-red-500 hover:text-red-400 hover:bg-glass-light transition-all cursor-pointer"
              >
                Sign Out
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
