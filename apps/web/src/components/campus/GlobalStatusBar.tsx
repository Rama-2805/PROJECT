// @ts-nocheck
// ─── SmartCampus AI — Global Campus Status Bar ────────

'use client';

import { useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';
import { Cpu, Activity, ShieldCheck, Users, Radio, Sparkles, Layers } from 'lucide-react';

function subscribeTime(callback: () => void) {
  const timer = setInterval(callback, 1000);
  return () => clearInterval(timer);
}

function getTimeSnapshot() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function GlobalStatusBar() {
  const globalStatus = useCampusStore((s) => s.globalStatus);
  const setShowPredictions = useCampusStore((s) => s.setShowPredictions);
  const showPredictions = useCampusStore((s) => s.showPredictions);
  const setShowDevices = useCampusStore((s) => s.setShowDevices);
  const showDevices = useCampusStore((s) => s.showDevices);
  const setShowLabels = useCampusStore((s) => s.setShowLabels);
  const showLabels = useCampusStore((s) => s.showLabels);

  const currentTime = useSyncExternalStore(subscribeTime, getTimeSnapshot, () => '');

  return (
    <motion.div
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-3 left-4 right-4 z-40 pointer-events-auto"
    >
      <div className="backdrop-blur-2xl bg-[#0b0f19]/90 rounded-2xl border border-white/15 shadow-2xl px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Brand & Real-Time Sync indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-white tracking-wide">Digital Twin Command Center</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai-blue/15 text-ai-blue border border-ai-blue/30 font-mono font-medium">
              Vemana IT
            </span>
          </div>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
            {currentTime || '--:--:--'}
          </span>
        </div>

        {/* Center: Live Telemetry Chips */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none py-0.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-gray-400 uppercase font-medium">Health</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">{globalStatus.campusHealth}%</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 shrink-0">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] text-gray-400 uppercase font-medium">Occupancy</span>
            <span className="text-xs font-bold text-white font-mono">{globalStatus.studentsPresent.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 shrink-0">
            <Radio className="w-3.5 h-3.5 text-ai-cyan" />
            <span className="text-[10px] text-gray-400 uppercase font-medium">Edge Nodes</span>
            <span className="text-xs font-bold text-white font-mono">{globalStatus.activeDevices} Online</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 shrink-0">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-gray-400 uppercase font-medium">Alerts</span>
            <span className="text-xs font-bold text-amber-400 font-mono">{globalStatus.criticalAlerts}</span>
          </div>
        </div>

        {/* Right: View Layer Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border ${
              showLabels
                ? 'bg-white/15 text-white border-white/20'
                : 'text-gray-400 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Layers className="w-3 h-3" />
            Labels
          </button>

          <button
            onClick={() => setShowDevices(!showDevices)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border ${
              showDevices
                ? 'bg-ai-blue/20 text-ai-blue border-ai-blue/30'
                : 'text-gray-400 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3 h-3" />
            Cameras
          </button>

          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border ${
              showPredictions
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'text-gray-400 hover:text-white border-transparent hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Predictions
          </button>
        </div>
      </div>
    </motion.div>
  );
}