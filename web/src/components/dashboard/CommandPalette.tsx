"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useUIStore } from "@/store/uiStore";
import { Search, Monitor, Users, Settings, LogOut, ChevronRight, Brain } from "lucide-react";
import { useRouter } from "next/navigation";

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const router = useRouter();

  // Close on esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="fixed inset-0" 
        onClick={() => setOpen(false)} 
        aria-hidden="true" 
      />
      
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1E] shadow-[0_0_40px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <Command 
          className="w-full flex flex-col"
          shouldFilter={true}
        >
          <div className="flex items-center border-b border-white/10 px-4">
            <Search className="mr-2 h-5 w-5 shrink-0 text-gray-400" />
            <Command.Input 
              autoFocus
              className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm text-white outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Type a command or search..." 
            />
            <kbd className="ml-auto hidden rounded bg-white/5 px-2 py-0.5 text-xs font-semibold text-gray-400 sm:block border border-white/10">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
            <Command.Empty className="py-6 text-center text-sm text-gray-400">
              No results found. Try asking the AI Assistant instead.
            </Command.Empty>

            <Command.Group heading="Suggestions" className="px-2 py-1.5 text-xs font-medium text-gray-400">
              <Command.Item 
                onSelect={() => { router.push("/dashboard/students"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none hover:bg-white/10 hover:text-white aria-selected:bg-white/10 aria-selected:text-white"
              >
                <Users className="mr-3 h-4 w-4 text-blue-400" />
                <span>Manage Students</span>
                <ChevronRight className="ml-auto h-4 w-4 text-gray-500" />
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/devices"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none hover:bg-white/10 hover:text-white aria-selected:bg-white/10 aria-selected:text-white"
              >
                <Monitor className="mr-3 h-4 w-4 text-purple-400" />
                <span>View Device Health</span>
                <ChevronRight className="ml-auto h-4 w-4 text-gray-500" />
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/ai-brain"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none hover:bg-white/10 hover:text-white aria-selected:bg-white/10 aria-selected:text-white"
              >
                <Brain className="mr-3 h-4 w-4 text-emerald-400" />
                <span>Ask AI Campus Brain</span>
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                  New
                </span>
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-white/5" />

            <Command.Group heading="System" className="px-2 py-1.5 text-xs font-medium text-gray-400">
              <Command.Item 
                onSelect={() => { router.push("/dashboard/settings"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none hover:bg-white/10 hover:text-white aria-selected:bg-white/10 aria-selected:text-white"
              >
                <Settings className="mr-3 h-4 w-4 text-gray-400" />
                <span>Settings</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => { setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-gray-200 outline-none hover:bg-red-500/20 hover:text-red-400 aria-selected:bg-red-500/20 aria-selected:text-red-400"
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span>Log out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
