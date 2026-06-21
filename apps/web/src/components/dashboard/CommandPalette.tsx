"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useUIStore } from "@/store/uiStore";
import { Search, Monitor, Users, Settings, LogOut, ChevronRight, Brain, ShieldAlert, BookOpen, FileText } from "lucide-react";
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
      
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-glass-border bg-bg-secondary/95 shadow-glass ring-1 ring-white/5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <Command 
          className="w-full flex flex-col"
          shouldFilter={true}
        >
          <div className="flex items-center border-b border-glass-border px-4">
            <Search className="mr-2 h-5 w-5 shrink-0 text-text-muted" />
            <Command.Input 
              autoFocus
              className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search students, teachers, HODs, classes, reports..." 
            />
            <kbd className="ml-auto hidden rounded bg-glass-light px-2 py-0.5 text-xs font-semibold text-text-muted sm:block border border-glass-border">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
            <Command.Empty className="py-6 text-center text-sm text-text-muted">
              No results found. Try search navigation.
            </Command.Empty>

            <Command.Group heading="Navigation & Directories" className="px-2 py-1.5 text-xs font-bold text-text-muted tracking-wider uppercase">
              <Command.Item 
                onSelect={() => { router.push("/dashboard/students"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary outline-none hover:bg-glass-medium hover:text-text-primary aria-selected:bg-glass-medium aria-selected:text-text-primary transition-colors"
              >
                <Users className="mr-3 h-4 w-4 text-blue-500" />
                <span>Students Directory</span>
                <ChevronRight className="ml-auto h-4 w-4 text-text-muted" />
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/teachers"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary outline-none hover:bg-glass-medium hover:text-text-primary aria-selected:bg-glass-medium aria-selected:text-text-primary transition-colors"
              >
                <Users className="mr-3 h-4 w-4 text-emerald-500" />
                <span>Teachers Directory</span>
                <ChevronRight className="ml-auto h-4 w-4 text-text-muted" />
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/hod"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary outline-none hover:bg-glass-medium hover:text-text-primary aria-selected:bg-glass-medium aria-selected:text-text-primary transition-colors"
              >
                <ShieldAlert className="mr-3 h-4 w-4 text-amber-500" />
                <span>HOD Management</span>
                <ChevronRight className="ml-auto h-4 w-4 text-text-muted" />
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/classrooms"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary outline-none hover:bg-glass-medium hover:text-text-primary aria-selected:bg-glass-medium aria-selected:text-text-primary transition-colors"
              >
                <BookOpen className="mr-3 h-4 w-4 text-purple-500" />
                <span>Classroom Assignment & Cameras</span>
                <ChevronRight className="ml-auto h-4 w-4 text-text-muted" />
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/attendance"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary outline-none hover:bg-glass-medium hover:text-text-primary aria-selected:bg-glass-medium aria-selected:text-text-primary transition-colors"
              >
                <FileText className="mr-3 h-4 w-4 text-rose-500" />
                <span>Attendance Logs & Reports</span>
                <ChevronRight className="ml-auto h-4 w-4 text-text-muted" />
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/devices"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary outline-none hover:bg-glass-medium hover:text-text-primary aria-selected:bg-glass-medium aria-selected:text-text-primary transition-colors"
              >
                <Monitor className="mr-3 h-4 w-4 text-sky-500" />
                <span>View Device Health</span>
                <ChevronRight className="ml-auto h-4 w-4 text-text-muted" />
              </Command.Item>
              <Command.Item 
                onSelect={() => { router.push("/dashboard/ai-brain"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary outline-none hover:bg-glass-medium hover:text-text-primary aria-selected:bg-glass-medium aria-selected:text-text-primary transition-colors"
              >
                <Brain className="mr-3 h-4 w-4 text-pink-500 animate-pulse" />
                <span>Ask AI Campus Brain</span>
                <span className="ml-auto flex h-5 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-400">
                  New
                </span>
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-2 h-px bg-glass-border" />

            <Command.Group heading="System Tools" className="px-2 py-1.5 text-xs font-bold text-text-muted tracking-wider uppercase">
              <Command.Item 
                onSelect={() => { router.push("/dashboard/settings"); setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary outline-none hover:bg-glass-medium hover:text-text-primary aria-selected:bg-glass-medium aria-selected:text-text-primary transition-colors"
              >
                <Settings className="mr-3 h-4 w-4 text-text-muted" />
                <span>Settings</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => { setOpen(false); }}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary outline-none hover:bg-red-500/10 hover:text-red-400 aria-selected:bg-red-500/10 aria-selected:text-red-400 transition-colors"
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
