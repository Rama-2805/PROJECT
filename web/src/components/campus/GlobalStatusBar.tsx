// @ts-nocheck
// ─── SmartCampus AI — Global Campus Status Bar ────────

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';

export function GlobalStatusBar() {
  const globalStatus = useCampusStore((s) => s.globalStatus);
  const setShowPredictions = useCampusStore((s) => s.setShowPredictions);
  const showPredictions = useCampusStore((s) => s.showPredictions);
  const setShowDevices = useCampusStore((s) => s.setShowDevices);
  const showDevices = useCampusStore((s) => s.showDevices);

  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const metrics = [
    { label: 'Campus Health', value: `${globalStatus.campusHealth}%`, color: globalStatus.campusHealth >= 90 ? 'text-emerald-400' : globalStatus.campusHealth >= 75 ? 'text-yellow-400' : 'text-red-400' },
    { label: 'Students', value: globalStatus.studentsPresent.toLocaleString(), sub: `/${globalStatus.totalStudents.toLocaleString()}` },
    { label: 'Active Devices', value: globalStatus.activeDevices.toString(), sub: `/${globalStatus.totalDevices}` },
    { label: 'AI Processing', value: `${globalStatus.aiProcessingRate}/s`, sub: 'events/sec' },
    { label: 'Critical Alerts', value: globalStatus.criticalAlerts.toString(), color: globalStatus.criticalAlerts > 0 ? 'text-red-400' : 'text-emerald-400' },
  ];

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-0 left-0 right-0 z-20"
    >
      <div className="mx-4 mt-3">
        <div className="backdrop-blur-xl bg-slate-900/70 rounded-2xl border border-slate-700/50 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
                <span className="text-sm font-semibold text-white tracking-wide">Campus Command Center</span>
              </div>
              <span className="text-xs text-slate-500">|</span>
              <span className="text-xs text-slate-400">
                {currentTime || '--:--:--'}
              </span>
            </div>

            <div className="flex items-center gap-6">
              {metrics.map((m) => (
                <div key={m.label} className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider">{m.label}:</span>
                  <span className={`text-sm font-bold tabular-nums ${m.color || 'text-white'}`}>{m.value}</span>
                  {m.sub && <span className="text-[10px] text-slate-600">{m.sub}</span>}
                </div>
              ))}

              <div className="w-px h-6 bg-slate-700/50" />

              {/* Toggle buttons */}
              <button
                onClick={() => setShowPredictions(!showPredictions)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  showPredictions ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Predictions
              </button>
              <button
                onClick={() => setShowDevices(!showDevices)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  showDevices ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Devices
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
