// @ts-nocheck
// ─── SmartCampus AI — Building Detail Panel ───────────

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';
import { 
  Building2, X, Eye, Activity, ShieldCheck, 
  Camera, Cpu, ArrowUpRight, CheckCircle2, AlertTriangle, Users
} from 'lucide-react';
import Link from 'next/link';

const HEALTH_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  normal: { label: 'Normal Operation', color: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  warning: { label: 'Thermal Warning', color: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  critical: { label: 'Critical Attention', color: 'text-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

export function BuildingDetailPanel() {
  const selectedBuilding = useCampusStore((s) => s.selectedBuilding);
  const setSelectedBuilding = useCampusStore((s) => s.setSelectedBuilding);
  const setCameraTarget = useCampusStore((s) => s.setCameraTarget);
  const devices = useCampusStore((s) => s.devices);
  const events = useCampusStore((s) => s.events);

  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'events'>('overview');

  const focus = () => {
    if (selectedBuilding) {
      setCameraTarget([selectedBuilding.position[0], selectedBuilding.position[1] + 2, selectedBuilding.position[2]]);
    }
  };

  const buildingDevices = devices.filter((d) => d.buildingId === selectedBuilding?.id);
  const buildingEvents = events.filter((e) => e.buildingId === selectedBuilding?.id);

  return (
    <AnimatePresence>
      {selectedBuilding && (
        <motion.div
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="absolute right-4 top-20 bottom-4 z-40 w-88 sm:w-96 pointer-events-auto"
        >
          <div className="h-full backdrop-blur-2xl bg-[#0b0f19]/95 rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="p-1.5 rounded-lg bg-ai-blue/15 text-ai-blue border border-ai-blue/30">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-white truncate">{selectedBuilding.name}</h3>
                    {HEALTH_LABELS[selectedBuilding.health] && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${HEALTH_LABELS[selectedBuilding.health].badge}`}>
                        {HEALTH_LABELS[selectedBuilding.health].label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1">{selectedBuilding.description}</p>
                </div>
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5 shrink-0"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'overview'
                      ? 'bg-ai-blue/20 text-ai-blue border border-ai-blue/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('devices')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'devices'
                      ? 'bg-ai-blue/20 text-ai-blue border border-ai-blue/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Cameras ({buildingDevices.length})
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'events'
                      ? 'bg-ai-blue/20 text-ai-blue border border-ai-blue/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Live Feed ({buildingEvents.length})
                </button>
              </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              {activeTab === 'overview' && (
                <>
                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <MetricBox label="Total Floors" value={`${selectedBuilding.floors} Floors`} sub="Elevator Access" />
                    <MetricBox label="Classrooms" value={`${selectedBuilding.activeClassrooms}/${selectedBuilding.totalClassrooms}`} sub="Active / Total" />
                    <MetricBox label="Students" value={`${selectedBuilding.studentsPresent.toLocaleString()}`} sub={`of ${selectedBuilding.totalStudents.toLocaleString()} enrolled`} />
                    <MetricBox label="Device Health" value={`${selectedBuilding.deviceHealth}%`} sub="Telemetry OK" />
                  </div>

                  {/* Attendance Rate */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Attendance Rate</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">{selectedBuilding.attendanceRate}%</span>
                    </div>
                    <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedBuilding.attendanceRate}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Real-time biometric attendance verified across all active sections.
                    </p>
                  </div>

                  {/* Engagement Score */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">AI Engagement Index</span>
                      <span className="text-sm font-bold text-sky-400 font-mono">{selectedBuilding.engagementScore}%</span>
                    </div>
                    <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedBuilding.engagementScore}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400"
                      />
                    </div>
                  </div>

                  {/* Active Sections */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-ai-blue" />
                        Classrooms in this Block
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Sessions Active</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs">
                        <div>
                          <span className="font-semibold text-white block">7th Sem - Section A</span>
                          <span className="text-[10px] text-gray-400">Prof. Kalaiselvi S • Room 701</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          92.8%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs">
                        <div>
                          <span className="font-semibold text-white block">7th Sem - Section B</span>
                          <span className="text-[10px] text-gray-400">Prof. Harish Kumar • Room 702</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          89.4%
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'devices' && (
                <div className="space-y-2">
                  {buildingDevices.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      No edge cameras assigned directly to this block.
                    </div>
                  ) : (
                    buildingDevices.map((d) => (
                      <div key={d.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-ai-blue" />
                            {d.name}
                          </span>
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                            d.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-gray-400 pt-1">
                          <div>CPU: <strong className="text-white">{d.cpuUsage}%</strong></div>
                          <div>Temp: <strong className="text-white">{d.temperature}°C</strong></div>
                          <div>Ping: <strong className="text-white">{d.lastHeartbeat}</strong></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'events' && (
                <div className="space-y-2">
                  {buildingEvents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      No active incident alerts in this building.
                    </div>
                  ) : (
                    buildingEvents.map((e) => (
                      <div key={e.id} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <p className="text-xs text-gray-300 leading-relaxed">{e.message}</p>
                        <span className="text-[10px] text-gray-500 block font-mono">{e.timestamp}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
              <button
                onClick={focus}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-white/10"
              >
                <Eye className="w-3.5 h-3.5" />
                Focus 3D View
              </button>
              <Link
                href="/dashboard/live-monitoring"
                className="flex-1 py-2 rounded-xl bg-ai-blue hover:bg-ai-blue/90 text-black text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Live Camera
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 font-medium">{label}</div>
      <div className="text-base font-bold text-white font-mono">{value}</div>
      {sub && <div className="text-[9px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}