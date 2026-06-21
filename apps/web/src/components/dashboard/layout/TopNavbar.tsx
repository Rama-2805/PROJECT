"use client";

import { useUIStore } from "@/store/uiStore";
import { Search, Bell, Sparkles, Moon, Sun, User, Command } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

export function TopNavbar() {
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const toggleAssistant = useUIStore((s) => s.toggleAssistant);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

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

  return (
    <header className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-6 border-b border-glass-border bg-bg-secondary/55 px-4 shadow-glass sm:px-6 lg:px-8 backdrop-blur-[20px] transition-colors duration-300">
      
      {/* Left: Breadcrumbs */}
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted tracking-wider uppercase">
          {segments.map((segment, index) => (
            <div key={segment} className="flex items-center gap-2">
              <span className={cn(
                "transition-all duration-300",
                index === segments.length - 1 
                  ? "text-text-primary font-bold bg-glass-heavy border border-glass-border px-2.5 py-1 rounded-lg shadow-glass" 
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
          <span className="font-normal text-text-muted group-hover:text-text-muted/90 transition-colors">Search terminal logs, devices, analytics...</span>
          <kbd className="ml-auto hidden rounded-lg bg-bg-primary px-2 py-1 text-[10px] font-bold text-text-muted sm:block border border-glass-border shadow-glass group-hover:text-text-primary transition-colors">
            <span className="flex items-center gap-1"><Command className="w-2.5 h-2.5"/>K</span>
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-1 items-center justify-end gap-x-4 lg:gap-x-5">
        
        {/* Notification Bell */}
        <button className="relative rounded-xl border border-glass-border bg-glass-light p-2.5 text-text-secondary hover:bg-glass-medium hover:border-glass-border/30 hover:text-text-primary transition-all shadow-glass group">
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-bg-primary animate-pulse"></span>
          <Bell className="h-4 w-4 group-hover:scale-110 transition-transform" />
        </button>

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
        <div className="relative">
          <button 
            onClick={() => {
              const el = document.getElementById("top-navbar-user-dropdown");
              if (el) el.classList.toggle("hidden");
            }}
            className="flex items-center gap-x-2 rounded-full p-0.5 hover:bg-glass-medium transition-all duration-300 border border-transparent hover:border-glass-border shadow-glass group"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-[1px]">
              <div className="h-full w-full rounded-full bg-bg-primary flex items-center justify-center border border-glass-border group-hover:bg-transparent transition-colors duration-300">
                <User className="h-4 w-4 text-text-secondary group-hover:text-text-primary" />
              </div>
            </div>
          </button>
          <div 
            id="top-navbar-user-dropdown" 
            className="hidden absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#111111]/90 backdrop-blur-[40px] border border-glass-border p-2 shadow-2xl z-[100]"
          >
            <Link 
              href="#" 
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                // Perform sign out
                document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                localStorage.removeItem("currentUserEmail");
                localStorage.removeItem("user-role");
                window.location.href = "/";
              }}
              className="block w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-white/5 transition-all cursor-pointer"
            >
              Sign Out
            </Link>
          </div>
        </div>

      </div>
    </header>
  );
}
