"use client";

import { useUIStore } from "@/store/uiStore";
import { Search, Bell, Sparkles, Moon, User, Command } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function TopNavbar() {
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const toggleAssistant = useUIStore((s) => s.toggleAssistant);
  const pathname = usePathname();

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
    <header className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-6 border-b border-white/10 bg-[#060814]/55 px-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)] sm:px-6 lg:px-8 backdrop-blur-[20px]">
      
      {/* Left: Breadcrumbs */}
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 tracking-wider uppercase">
          {segments.map((segment, index) => (
            <div key={segment} className="flex items-center gap-2">
              <span className={index === segments.length - 1 ? "text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "hover:text-white transition-colors"}>
                {segment.replace(/-/g, " ")}
              </span>
              {index < segments.length - 1 && <span className="text-gray-700">/</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Center: Search Trigger */}
      <div className="hidden flex-1 sm:flex justify-center">
        <button
          onClick={toggleCommandPalette}
          className="group flex w-full max-w-md items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.08] hover:border-blue-500/30 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.2)] focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
        >
          <Search className="h-4 w-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
          <span className="font-normal text-gray-500 group-hover:text-gray-400 transition-colors">Search terminal logs, devices, analytics...</span>
          <kbd className="ml-auto hidden rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-gray-400 sm:block border border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.4)] group-hover:text-white transition-colors">
            <span className="flex items-center gap-1"><Command className="w-2.5 h-2.5"/>K</span>
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-1 items-center justify-end gap-x-4 lg:gap-x-5">
        
        {/* Notification Bell */}
        <button className="relative rounded-xl border border-white/5 bg-white/5 p-2.5 text-gray-400 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-[0_2px_8px_rgba(0,0,0,0.15)] group">
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-[#060814] animate-pulse"></span>
          <Bell className="h-4 w-4 group-hover:scale-110 transition-transform" />
        </button>

        {/* AI Assistant Toggle */}
        <button 
          onClick={toggleAssistant}
          className="relative rounded-xl bg-gradient-to-br from-blue-600/15 via-purple-600/10 to-transparent p-2.5 text-blue-400 border border-blue-500/30 hover:border-blue-400/40 hover:text-blue-300 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] hover:scale-105 group"
        >
          <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
        </button>

        {/* Theme Toggle */}
        <button className="rounded-xl border border-white/5 bg-white/5 p-2.5 text-gray-400 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-[0_2px_8px_rgba(0,0,0,0.15)] group">
          <Moon className="h-4 w-4 group-hover:scale-110 transition-transform" />
        </button>

        {/* Separator */}
        <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-white/10" aria-hidden="true" />

        {/* User Avatar */}
        <button className="flex items-center gap-x-2 rounded-full p-0.5 hover:bg-white/5 transition-all duration-300 border border-white/0 hover:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.2)] group">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-[1px]">
            <div className="h-full w-full rounded-full bg-[#060814] flex items-center justify-center border border-white/5 group-hover:bg-transparent transition-colors duration-300">
              <User className="h-4 w-4 text-gray-300 group-hover:text-white" />
            </div>
          </div>
        </button>

      </div>
    </header>
  );
}
