"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, ShieldCheck, Siren, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiRequest } from "@/lib/api/client";
import { useEmergencyAlerts } from "@/lib/hooks/useEmergencyAlerts";
import { useAuthStore } from "@/lib/store/auth";

const SEARCH_DATABASE = [
  { type: "Student", name: "A Abhijith", usn: "1VI23CS001", info: "7th Sem - Section A • 92.4%", link: "/dashboard/reports" },
  { type: "Student", name: "Aaliya Viquas", usn: "1VI23CS005", info: "7th Sem - Section A (Enrolled) • 96.8%", link: "/dashboard/reports" },
  { type: "Student", name: "Abhiram N", usn: "1VI23CS006", info: "7th Sem - Section A (Enrolled) • 94.5%", link: "/dashboard/reports" },
  { type: "Student", name: "Anvik C Shetty", usn: "1VI23CS012", info: "7th Sem - Section A • 94.2%", link: "/dashboard/reports" },
  { type: "Student", name: "Manjunatha R", usn: "1VI23CS058", info: "7th Sem - Section A (Enrolled) • 95.0%", link: "/dashboard/reports" },
  { type: "Student", name: "Prajwal R", usn: "1VI23CS066", info: "7th Sem - Section B • 89.4%", link: "/dashboard/reports" },
  { type: "Student", name: "Rakshith M", usn: "1VI23CS070", info: "7th Sem - Section B (Enrolled) • 95.2%", link: "/dashboard/reports" },
  { type: "Student", name: "Siddharth Saxena", usn: "CSE2026002", info: "7th Sem - Section A • 91.0%", link: "/dashboard/reports" },
  { type: "Teacher", name: "Prof. Kalaiselvi S", info: "Class Teacher (7th Sem - Section A)", link: "/dashboard/teachers" },
  { type: "Teacher", name: "Prof. Harish Kumar", info: "Class Teacher (7th Sem - Section B)", link: "/dashboard/teachers" },
  { type: "HOD", name: "Dr. Ramakrishna", info: "Head of Department (CSE)", link: "/dashboard/hod" },
  { type: "Classroom", name: "7th Sem - Section A (Room 701)", info: "Camera CAM-023-A Online", link: "/dashboard/live-monitoring" },
  { type: "Classroom", name: "7th Sem - Section B (Room 702)", info: "Camera CAM-402-A Online", link: "/dashboard/live-monitoring" },
  { type: "Report", name: "VTU 7th Sem Attendance Register", info: "Official VTU PDF format", link: "/dashboard/reports" },
];

/* ─── Header Component ─────────────────────────────────────────── */
export interface HeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      if (typeof window === "undefined") return;
      const email = localStorage.getItem("currentUserEmail");
      const name = localStorage.getItem("currentUserName");
      const role = localStorage.getItem("user-role") || "admin";

      try {
        const res = await apiRequest<any>("/auth/profile");
        if (res && res.success && res.data && isMounted) {
          const u = res.data;
          const stu = u.student || {};
          const displayName = stu.fullName || u.fullName || name || "User";
          setCurrentUser({
            email: u.email,
            fullName: displayName,
            role: role
          });
          localStorage.setItem("currentUserName", displayName);
          return;
        }
      } catch {}

      if (isMounted && email) {
        setCurrentUser({
          email,
          fullName: name || (role === "admin" ? "System Admin" : role === "teacher" ? "Faculty" : "Student"),
          role,
        });
      }
    }
    loadUser();
    return () => { isMounted = false; };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return SEARCH_DATABASE.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.usn && item.usn.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.getElementById("global-search-input");
        if (input) input.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const router = useRouter();

  const handleMenuClick = useCallback(async (item: string) => {
    setUserMenuOpen(false);
    if (item === "Sign Out") {
      try {
        await useAuthStore.getState().logout();
      } catch (e) {
        console.error("Sign out error", e);
      }
      document.cookie = "smartcampus_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
      document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
      localStorage.removeItem("currentUserEmail");
      localStorage.removeItem("currentUserName");
      localStorage.removeItem("user-role");
      window.location.href = "/";
    } else if (item === "Profile" || item === "Settings") {
      router.push("/dashboard/settings");
    } else if (item === "Help") {
      router.push("/features");
    }
  }, [router]);

  const {
    emergencies,
    unreadEmergencyCount,
    acknowledgeEmergency,
    resolveEmergency,
    clearAllEmergencies,
    triggerSimulatedEmergency,
  } = useEmergencyAlerts();

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
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4 relative">
          <div className="relative w-full group">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students, teachers, classes..."
              className="w-full h-9 pl-9 pr-3 rounded-lg text-xs bg-glass-light border border-glass-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ai-blue/40 transition-colors"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] bg-glass-heavy text-text-muted font-mono border border-glass-border hidden sm:inline-block">
              ⌘K
            </kbd>
          </div>

          {/* Search Dropdown Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute left-0 right-0 top-full mt-2 glass-heavy border border-glass-border rounded-xl p-2 shadow-2xl max-h-80 overflow-y-auto"
              >
                {searchResults.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    onClick={() => setSearchQuery("")}
                    className="flex justify-between items-center p-2 rounded-lg hover:bg-glass-light transition-colors text-xs text-text-primary"
                  >
                    <div>
                      <p className="font-semibold text-text-primary">{item.name}</p>
                      <p className="text-[10px] text-text-muted">{item.type} • {item.info}</p>
                    </div>
                    {item.usn && <span className="text-[9px] font-mono text-ai-blue">{item.usn}</span>}
                  </a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* AI Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/10 border border-success/20">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-glow-pulse" />
            <span className="text-[10px] font-medium text-success">AI ACTIVE</span>
          </div>

          {/* Health */}
          <a href="/dashboard/system">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-glass-light border border-glass-border hover:bg-glass-medium transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-ai-blue" />
              <span className="text-[10px] font-medium text-text-dim">98% Health</span>
            </div>
          </a>

          {/* Notification Bell (Emergencies & Critical System Alerts Only) */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg glass hover:bg-glass-medium transition-colors cursor-pointer"
              aria-label="Emergency Notifications"
            >
              <Bell className="w-4 h-4 text-text-dim" />
              {unreadEmergencyCount > 0 ? (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-[9px] font-bold text-white flex items-center justify-center animate-pulse shadow-sm">
                  {unreadEmergencyCount}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 top-full mt-2 w-88 sm:w-96 glass-heavy border border-glass-border rounded-2xl p-4 shadow-2xl z-50 backdrop-blur-2xl"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 border-b border-glass-border pb-2.5">
                    <div className="flex items-center gap-2">
                      {unreadEmergencyCount > 0 ? (
                        <Siren className="w-4 h-4 text-red-500 animate-pulse" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="text-xs font-bold text-text-primary tracking-wide">
                        Emergency Dispatch
                      </span>
                    </div>

                    {unreadEmergencyCount > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
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
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ALL SYSTEMS CLEAR
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {unreadEmergencyCount === 0 ? (
                      <div className="py-4 px-2 text-center space-y-2">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">Zero Active Emergencies</p>
                          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                            No active SOS panic triggers, unauthorized breaches, or IoT node disconnections reported.
                          </p>
                        </div>

                        {/* Operational Telemetry Chips */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1 text-left">
                          <div className="p-2 rounded-lg bg-glass-light border border-glass-border">
                            <span className="text-[10px] text-text-muted block">IoT Edge Nodes</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">6/6 Online</span>
                          </div>
                          <div className="p-2 rounded-lg bg-glass-light border border-glass-border">
                            <span className="text-[10px] text-text-muted block">Perimeter Security</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">Secure</span>
                          </div>
                        </div>

                        {/* Drill Trigger */}
                        <button
                          onClick={() => triggerSimulatedEmergency("SOS")}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-glass-light hover:bg-glass-medium border border-glass-border text-[10px] font-medium text-text-muted hover:text-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Simulate Emergency Drill
                        </button>
                      </div>
                    ) : (
                      emergencies.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-text-primary space-y-2 shadow-sm"
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
                <span className="text-[10px] font-bold text-white text-center">
                  {currentUser?.fullName ? currentUser.fullName.replace("Dr. ", "").replace("Prof. ", "").charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              <span className="hidden sm:block text-xs font-medium text-text-primary">
                {currentUser?.fullName || "User"}
              </span>
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
                      onClick={() => handleMenuClick(item)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors cursor-pointer"
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
