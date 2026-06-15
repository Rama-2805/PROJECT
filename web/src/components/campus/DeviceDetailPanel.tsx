// @ts-nocheck
// ─── SmartCampus AI — Device Detail Panel ─────────────

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  online: { label: 'Online', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  warning: { label: 'Warning', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  offline: { label: 'Offline', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

const TYPE_ICONS: Record<string, string> = {
  camera: '📷',
  edge_ai: '🧠',
  sensor: '🌡️',
};

export function DeviceDetailPanel() {
  const selectedDevice = useCampusStore((s) => s.selectedDevice);
  const setSelectedDevice = useCampusStore((s) => s.setSelectedDevice);

  return (
    <AnimatePresence>
      {selectedDevice && (
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
                    <span className="text-lg">{TYPE_ICONS[selectedDevice.type]}</span>
                    <h3 className="text-lg font-bold text-white">{selectedDevice.name}</h3>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[selectedDevice.status].bg} ${STATUS_STYLES[selectedDevice.status].color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedDevice.status === 'online' ? 'bg-emerald-400' : selectedDevice.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    {STATUS_STYLES[selectedDevice.status].label}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">ID: {selectedDevice.deviceId}</p>
            </div>

            {/* Metrics */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">CPU Usage</div>
                  <div className="text-lg font-bold text-white">{selectedDevice.cpuUsage}%</div>
                  <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedDevice.cpuUsage}%` }}
                      className={`h-full rounded-full ${selectedDevice.cpuUsage > 80 ? 'bg-red-400' : selectedDevice.cpuUsage > 60 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                    />
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Memory</div>
                  <div className="text-lg font-bold text-white">{selectedDevice.memoryUsage}%</div>
                  <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedDevice.memoryUsage}%` }}
                      className={`h-full rounded-full ${selectedDevice.memoryUsage > 80 ? 'bg-red-400' : selectedDevice.memoryUsage > 60 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <InfoRow label="Model Version" value={selectedDevice.modelVersion} />
                <InfoRow label="Temperature" value={`${selectedDevice.temperature}°C`} />
                <InfoRow label="Last Heartbeat" value={selectedDevice.lastHeartbeat} />
                <InfoRow label="Type" value={selectedDevice.type.replace('_', ' ').toUpperCase()} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-medium text-white font-mono">{value}</span>
    </div>
  );
}
