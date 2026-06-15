// @ts-nocheck
// ─── SmartCampus AI — Real-Time Event Stream ──────────

'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';

const SEVERITY_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  info: { bg: 'bg-slate-800/50 border-slate-700/30', dot: 'bg-cyan-400', label: 'info' },
  warning: { bg: 'bg-yellow-500/5 border-yellow-500/20', dot: 'bg-yellow-400', label: 'warning' },
  error: { bg: 'bg-red-500/5 border-red-500/20', dot: 'bg-red-400', label: 'error' },
};

export function AIEventStream() {
  const events = useCampusStore((s) => s.events);
  const simulateEvent = useCampusStore((s) => s.simulateEvent);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  // Simulate events every 5 seconds
  useEffect(() => {
    const interval = setInterval(simulateEvent, 5000);
    return () => clearInterval(interval);
  }, [simulateEvent]);

  const typeFilter = useCampusStore((s) => s.selectedBuilding);

  const filteredEvents = typeFilter
    ? events.filter((e) => e.buildingId === typeFilter.id)
    : events;

  return (
    <div className="absolute bottom-4 right-4 z-20 w-80">
      <div className="backdrop-blur-xl bg-slate-900/80 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-white">Live Events</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {events.length} events
          </span>
        </div>

        <div ref={scrollRef} className="h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <AnimatePresence initial={false}>
            {filteredEvents.slice(0, 20).map((event, i) => {
              const style = SEVERITY_STYLES[event.severity];
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, height: 0, x: 20 }}
                  animate={{ opacity: 1, height: 'auto', x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.02 }}
                  className={`px-4 py-2 border-b border-slate-800/50 ${style.bg}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-300 leading-relaxed">{event.message}</p>
                      <span className="text-[10px] text-slate-600 mt-0.5 block">{event.timestamp}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="px-4 py-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> info
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> warning
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> error
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
