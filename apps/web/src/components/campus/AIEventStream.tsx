// @ts-nocheck
// ─── SmartCampus AI — Real-Time Event Stream ──────────

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';
import { Activity, ChevronDown, ChevronUp, Bell, ArrowRight } from 'lucide-react';

const SEVERITY_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  info: { bg: 'bg-white/[0.02] border-white/5', dot: 'bg-emerald-400', label: 'info' },
  warning: { bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400', label: 'warning' },
  error: { bg: 'bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-400', label: 'error' },
};

export function AIEventStream() {
  const events = useCampusStore((s) => s.events);
  const simulateEvent = useCampusStore((s) => s.simulateEvent);
  const selectedBuilding = useCampusStore((s) => s.selectedBuilding);
  const setSelectedBuilding = useCampusStore((s) => s.setSelectedBuilding);
  const buildings = useCampusStore((s) => s.buildings);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isMinimized, setIsMinimized] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'warning' | 'attendance'>('all');

  // Auto-scroll on new events
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, isMinimized]);

  // Simulate real-time campus events every 6s
  useEffect(() => {
    const interval = setInterval(simulateEvent, 6000);
    return () => clearInterval(interval);
  }, [simulateEvent]);

  // If building detail inspector is open on the right, hide this widget so they NEVER collide!
  if (selectedBuilding) {
    return null;
  }

  const filteredEvents = events.filter((e) => {
    if (filterSeverity === 'warning') return e.severity === 'warning' || e.severity === 'error';
    if (filterSeverity === 'attendance') return e.type === 'attendance';
    return true;
  });

  return (
    <div className="absolute bottom-4 right-4 z-30 w-88 sm:w-96 pointer-events-auto">
      <div className="backdrop-blur-2xl bg-[#0b0f19]/95 rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
            <span className="text-xs font-bold text-white tracking-wide">Campus Event Stream</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-ai-blue/15 text-ai-blue border border-ai-blue/30 font-mono font-medium">
              Live
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-mono">
              {filteredEvents.length} events
            </span>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title={isMinimized ? "Expand Activity Feed" : "Minimize Activity Feed"}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Filter pills */}
        {!isMinimized && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/5 bg-black/20 text-[10px]">
            <button
              onClick={() => setFilterSeverity('all')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterSeverity === 'all' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilterSeverity('attendance')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterSeverity === 'attendance' ? 'bg-ai-blue/20 text-ai-blue' : 'text-gray-400 hover:text-white'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setFilterSeverity('warning')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                filterSeverity === 'warning' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-white'
              }`}
            >
              Alerts
            </button>
          </div>
        )}

        {/* Body list */}
        {!isMinimized && (
          <div ref={scrollRef} className="h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {filteredEvents.slice(0, 25).map((event) => {
                const style = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info;
                const building = buildings.find((b) => b.id === event.buildingId);

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      if (building) setSelectedBuilding(building);
                    }}
                    className={`px-3.5 py-2 hover:bg-white/[0.04] transition-colors cursor-pointer group flex items-start gap-2.5 ${style.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-200 leading-snug group-hover:text-white transition-colors">
                        {event.message}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 font-mono">
                        <span>{event.timestamp}</span>
                        {building && (
                          <span className="text-ai-cyan group-hover:underline flex items-center gap-0.5">
                            {building.shortName} <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] text-gray-400 font-mono">
          <span>Click any event to focus building</span>
          <span className="text-emerald-400">Stream Connected</span>
        </div>
      </div>
    </div>
  );
}