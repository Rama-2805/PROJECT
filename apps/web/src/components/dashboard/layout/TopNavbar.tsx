"use client";

import { useUIStore } from "@/store/uiStore";
import {
  Search,
  Bell,
  Moon,
  Sun,
  User,
  Command,
  Menu,
  ShieldCheck,
  Siren,
  Trash2,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { useEmergencyAlerts } from "@/lib/hooks/useEmergencyAlerts";
import { useAuthStore } from "@/lib/store/auth";

export function TopNavbar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const pathname = usePathname();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const {
    emergencies,
    unreadEmergencyCount,
    acknowledgeEmergency,
    resolveEmergency,
    clearAllEmergencies,
    triggerSimulatedEmergency,
  } = useEmergencyAlerts();

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

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
        
        {/* Emergency & Campus Safety Bell */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={cn(
              "relative rounded-xl border p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all shadow-glass group cursor-pointer",
              unreadEmergencyCount > 0
                ? "border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "border-glass-border bg-glass-light text-text-secondary hover:bg-glass-medium hover:border-glass-border/30 hover:text-text-primary"
            )}
            title={unreadEmergencyCount > 0 ? "Campus Emergency Alert" : "Campus Safety & Emergency Status: All Systems Normal"}
          >
            {unreadEmergencyCount > 0 ? (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse shadow-md font-mono">
                {unreadEmergencyCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 border border-bg-primary" />
            )}
            <Bell className={cn("h-4 w-4 transition-transform", unreadEmergencyCount > 0 ? "animate-bounce text-red-400" : "group-hover:scale-110")} />
          </button>
          
          {isNotificationsOpen && (
            <div className="fixed sm:absolute right-4 sm:right-0 top-20 sm:top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-bg-secondary/95 dark:bg-[#0c1017]/95 backdrop-blur-2xl border border-glass-border p-3.5 shadow-2xl z-[100] text-xs transition-colors duration-300">
              {/* Header */}
              <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-glass-border">
                <div className="flex items-center gap-2">
                  {unreadEmergencyCount > 0 ? (
                    <Siren className="w-4 h-4 text-red-500 animate-pulse" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="font-bold text-text-primary">
                    Emergency Dispatch
                  </span>
                </div>
                
                {unreadEmergencyCount > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                      {unreadEmergencyCount} CRITICAL
                    </span>
                    <button
                      onClick={clearAllEmergencies}
                      className="p-1 rounded hover:bg-glass-light text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                      title="Clear All Emergencies"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    ALL CLEAR
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                {unreadEmergencyCount === 0 ? (
                  <div className="py-4 px-3 text-center space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">Zero Active Emergencies</p>
                      <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                        Campus security perimeters, panic switches, and IoT vision nodes operating within safety parameters.
                      </p>
                    </div>

                    {/* Operational Telemetry Chips */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-left">
                      <div className="p-2 rounded-lg bg-glass-light border border-glass-border">
                        <span className="text-[10px] text-text-muted block">IoT Cameras</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">6/6 Online</span>
                      </div>
                      <div className="p-2 rounded-lg bg-glass-light border border-glass-border">
                        <span className="text-[10px] text-text-muted block">Campus Perimeter</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">Secure</span>
                      </div>
                    </div>

                    {/* Test Drill Trigger Button */}
                    <button
                      onClick={() => triggerSimulatedEmergency("SOS")}
                      className="w-full mt-2 py-1.5 px-3 rounded-lg bg-glass-light hover:bg-glass-medium border border-glass-border text-[10px] font-medium text-text-muted hover:text-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Simulate Emergency Drill</span>
                    </button>
                  </div>
                ) : (
                  emergencies.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-text-primary space-y-2 shadow-sm animate-in fade-in"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-600 text-white font-mono animate-pulse">
                            {alert.severity}
                          </span>
                          <span className="font-bold text-xs text-red-400 leading-tight">
                            {alert.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono shrink-0">
                          {alert.timestamp}
                        </span>
                      </div>

                      <p className="text-[11px] text-text-secondary leading-snug">
                        {alert.description}
                      </p>

                      <div className="text-[10px] font-mono text-text-muted flex items-center gap-1.5 pt-1 border-t border-red-500/20">
                        <span>📍 {alert.location}</span>
                        {alert.deviceNode && (
                          <span className="text-ai-cyan font-bold">• {alert.deviceNode}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => acknowledgeEmergency(alert.id)}
                          className="px-2 py-1 rounded-md text-[10px] font-medium bg-glass-light hover:bg-glass-medium border border-glass-border text-text-primary transition-colors cursor-pointer"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => resolveEmergency(alert.id)}
                          className="px-2 py-1 rounded-md text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-sm"
                        >
                          Resolve & Clear
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="rounded-xl border border-glass-border bg-glass-light p-2.5 text-text-secondary hover:bg-glass-medium hover:border-glass-border/30 hover:text-text-primary transition-all shadow-glass group cursor-pointer"
          aria-label="Toggle theme"
          title={`Switch to ${theme === "dark" ? "Light Mode" : "Dark Mode"}`}
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
                onClick={async (e: React.MouseEvent) => {
                  e.preventDefault();
                  await useAuthStore.getState().logout();
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
