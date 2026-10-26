// @ts-nocheck
// ─── SmartCampus AI — Time Machine & Navigation Control ───

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';
import { Clock, MousePointer, RotateCw, Sparkles } from 'lucide-react';

const MODES = [
  { id: 'past' as const, label: 'Past', icon: '↩' },
  { id: 'present' as const, label: 'Live Now', icon: '●' },
  { id: 'future' as const, label: 'AI Prediction', icon: '↪' },
];

export function TimeMachineControl() {
  const timeMachine = useCampusStore((s) => s.timeMachine);
  const setTimeMachine = useCampusStore((s) => s.setTimeMachine);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
    >
      <div className="backdrop-blur-2xl bg-[#0b0f19]/90 rounded-2xl border border-white/15 shadow-2xl px-3 py-1.5 flex items-center gap-2 sm:gap-3">
        {/* Modes */}
        <div className="flex items-center gap-1">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setTimeMachine({ mode: mode.id })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                timeMachine.mode === mode.id
                  ? 'bg-white/20 text-white border border-white/25 shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={`text-[10px] ${mode.id === 'present' ? 'text-emerald-400 animate-pulse' : ''}`}>
                {mode.icon}
              </span>
              {mode.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/15 hidden sm:block" />

        {/* Orbit / Navigation Controls hint */}
        <div className="hidden md:flex items-center gap-2.5 text-[10px] text-gray-400 font-mono">
          <span className="flex items-center gap-1">
            <MousePointer className="w-3 h-3 text-ai-blue" /> Drag to Rotate
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <RotateCw className="w-3 h-3 text-ai-cyan" /> Scroll to Zoom
          </span>
          <span>•</span>
          <span>👆 Click Building</span>
        </div>
      </div>
    </motion.div>
  );
}