/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// ─── SmartCampus AI — Time Machine Control ────────────

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';

const MODES = [
  { id: 'past' as const, label: 'Past', icon: '↩️' },
  { id: 'present' as const, label: 'Present', icon: '●' },
  { id: 'future' as const, label: 'Future', icon: '↪️' },
];

export function TimeMachineControl() {
  const timeMachine = useCampusStore((s) => s.timeMachine);
  const setTimeMachine = useCampusStore((s) => s.setTimeMachine);

  const [dateString, setDateString] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDateString(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  }, []);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
    >
      <div className="backdrop-blur-xl bg-[#111111]/90 rounded-2xl border border-white/10 shadow-2xl px-3 py-2">
        <div className="flex items-center gap-2">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setTimeMachine({ mode: mode.id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                timeMachine.mode === mode.id
                  ? 'bg-white/10 text-white border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <span className="text-sm">{mode.icon}</span>
              {mode.label}
            </button>
          ))}

          <div className="w-px h-5 bg-white/10 mx-1" />

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400">
              {timeMachine.mode === 'present'
                ? (dateString || '')
                : timeMachine.mode === 'past'
                  ? 'Viewing historical data'
                  : 'AI predictions active'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
