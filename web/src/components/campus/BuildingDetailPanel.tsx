// @ts-nocheck
// ─── SmartCampus AI — Building Detail Panel ───────────

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';

const HEALTH_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  normal: { label: 'Normal', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  warning: { label: 'Warning', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  critical: { label: 'Critical', color: 'text-red-400', dot: 'bg-red-400' },
};

export function BuildingDetailPanel() {
  const selectedBuilding = useCampusStore((s) => s.selectedBuilding);
  const setSelectedBuilding = useCampusStore((s) => s.setSelectedBuilding);
  const setCameraTarget = useCampusStore((s) => s.setCameraTarget);

  const focus = () => {
    if (selectedBuilding) {
      setCameraTarget(selectedBuilding.position);
    }
  };

  return (
    <AnimatePresence>
      {selectedBuilding && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute right-4 top-20 bottom-4 z-20 w-80"
        >
          <div className="h-full backdrop-blur-xl bg-slate-900/80 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{selectedBuilding.name}</h3>
                    {HEALTH_LABELS[selectedBuilding.health] && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${HEALTH_LABELS[selectedBuilding.health].color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_LABELS[selectedBuilding.health].dot}`} />
                        {HEALTH_LABELS[selectedBuilding.health].label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{selectedBuilding.description}</p>
                </div>
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricBox label="Floors" value={selectedBuilding.floors} />
                <MetricBox label="Classrooms" value={`${selectedBuilding.activeClassrooms}/${selectedBuilding.totalClassrooms}`} />
                <MetricBox label="Students" value={`${selectedBuilding.studentsPresent.toLocaleString()}/${selectedBuilding.totalStudents.toLocaleString()}`} />
                <MetricBox label="Device Health" value={`${selectedBuilding.deviceHealth}%`} />
              </div>

              {/* Attendance */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Attendance Rate</span>
                  <span className="text-sm font-bold text-white">{selectedBuilding.attendanceRate}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedBuilding.attendanceRate}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  />
                </div>
              </div>

              {/* Engagement */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Engagement Score</span>
                  <span className="text-sm font-bold text-white">{selectedBuilding.engagementScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedBuilding.engagementScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                  />
                </div>
              </div>

              {/* AI Alerts */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50">
                <span className="text-xs text-slate-400">AI Alerts</span>
                <span className={`text-sm font-bold ${selectedBuilding.aiAlerts > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {selectedBuilding.aiAlerts}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
              <button
                onClick={focus}
                className="w-full px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
              >
                Focus in 3D View
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}
