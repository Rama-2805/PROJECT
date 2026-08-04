"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { getUsers } from "@/lib/userStore";
import { apiRequest } from "@/lib/api/client";

/* ─── Header Component ─────────────────────────────────────────── */
export interface HeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
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
      } catch (e) {}

      if (isMounted) {
        const users = getUsers();
        if (email && users[email]) {
          setCurrentUser(users[email]);
        } else {
          setCurrentUser({
            email: email || "admin@collegename.edu.in",
            fullName: name || (role === "admin" ? "System Admin" : role === "teacher" ? "Dr. Sarah Jenkins" : "Student"),
            role: role
          });
        }
      }
    }
    loadUser();
    return () => { isMounted = false; };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const SEARCH_DATABASE = [
    { type: "Student", name: "Siddharth Saxena", usn: "CSE2026002", info: "CSE 5th Sem", link: "/dashboard/reports?tab=studentCard" },
    { type: "Student", name: "Manish Bose", usn: "CSE2026001", info: "CSE 5th Sem", link: "/dashboard/reports?tab=studentCard" },
    { type: "Student", name: "Karan Nair", usn: "CSE2026003", info: "CSE 5th Sem (Low Att)", link: "/dashboard/reports?tab=studentCard" },
    { type: "Student", name: "Shreya Agarwal", usn: "CSE2026008", info: "CSE 5th Sem", link: "/dashboard/reports?tab=studentCard" },
    { type: "Teacher", name: "Dr. Sarah Jenkins", info: "CSE Department Head", link: "/dashboard/teachers" },
    { type: "Classroom", name: "CSE Lab 301", info: "Active session running", link: "/dashboard/live-monitoring" },
    { type: "Classroom", name: "AI Research Lab", info: "CCTV active", link: "/dashboard/live-monitoring" },
    { type: "Unknown Face", name: "CLUST-01 (8 detections)", info: "Suggested match: Karan Nair", link: "/teacher/unknown-faces" },
    { type: "Report", name: "Daily Attendance Ledger - June 2026", info: "PDF format archive", link: "/dashboard/reports" },
  ];

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = SEARCH_DATABASE.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.usn && item.usn.toLowerCase().includes(q))
    );
    setSearchResults(matches);
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

  const handleMenuClick = (item: string) => {
    if (item === "Sign Out") {
      document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem("currentUserEmail");
      localStorage.removeItem("user-role");
      window.location.href = "/";
    }
  };

  const notifications = [
    { id: 1, text: "Siddharth Saxena marked PRESENT (DSA class)", severity: "info", time: "Just now" },
    { id: 2, text: "Unknown face cluster CLUST-01 reoccurred in Lab 301", severity: "warning", time: "5m ago" },
    { id: 3, text: "FAISS vector database rebuilt successfully", severity: "info", time: "1h ago" },
    { id: 4, text: "Edge CCTV Camera Lab 301 offline alert!", severity: "critical", time: "2h ago" },
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

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg glass hover:bg-glass-medium transition-colors cursor-pointer"
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
                  className="absolute right-0 top-full mt-2 w-80 glass-heavy border border-glass-border rounded-xl p-3 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-glass-border pb-2">
                    <span className="text-xs font-bold text-text-primary">System Notification Center</span>
                    <button className="text-[10px] text-ai-blue hover:underline" onClick={() => setNotifOpen(false)}>Dismiss</button>
                  </div>
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex gap-2.5 p-2 rounded-lg hover:bg-glass-light transition-colors text-xs border border-transparent hover:border-glass-border">
                        <div className={cn(
                          "mt-1 h-2 w-2 rounded-full shrink-0",
                          n.severity === "critical" && "bg-error animate-glow-pulse",
                          n.severity === "warning" && "bg-warning",
                          n.severity === "info" && "bg-ai-blue",
                        )} />
                        <div className="min-w-0">
                          <p className="text-text-primary leading-tight">{n.text}</p>
                          <p className="text-[9px] text-text-muted mt-0.5">{n.time}</p>
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
