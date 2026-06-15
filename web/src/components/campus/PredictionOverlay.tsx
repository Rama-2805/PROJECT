// @ts-nocheck
// ─── SmartCampus AI — Prediction Overlay ─────────────

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';

const CATEGORY_COLORS: Record<string, string> = {
  occupancy: 'border-cyan-500/30',
  device: 'border-yellow-500/30',
  engagement: 'border-purple-500/30',
  attendance: 'border-emerald-500/30',
};

const IMPACT_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Low Impact', color: 'text-emerald-400' },
  medium: { label: 'Medium Impact', color: 'text-yellow-400' },
  high: { label: 'High Impact', color: 'text-red-400' },
};

export function PredictionOverlay() {
  const predictions = useCampusStore((s) => s.predictions);
  const showPredictions = useCampusStore((s) => s.showPredictions);

  return (
    <AnimatePresence>
      {showPredictions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-4 left-4 z-20 w-96"
        >
          <div className="backdrop-blur-xl bg-slate-900/80 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">AI Predictions</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-300 font-medium">LIVE</span>
              </div>
              <span className="text-[10px] text-slate-500">{predictions.length} active</span>
            </div>

            <div className="divide-y divide-slate-800/50 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {predictions.map((p, i) => {
                const impact = IMPACT_LABELS[p.impact];
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-3 border-l-2 ${CATEGORY_COLORS[p.category] || 'border-slate-700/50'} hover:bg-slate-800/30 transition-colors cursor-pointer`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs font-semibold text-white">{p.title}</h4>
                      <span className={`text-[10px] font-medium whitespace-nowrap ${impact.color}`}>{impact.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-1.5">{p.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">Confidence:</span>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${p.confidence}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            />
                          </div>
                          <span className="text-[10px] font-mono text-cyan-300">{p.confidence}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-600">{p.targetTime}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
