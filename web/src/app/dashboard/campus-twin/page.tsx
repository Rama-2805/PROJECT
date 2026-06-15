// ─── SmartCampus AI — Campus Digital Twin Command Center ─

'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { GlobalStatusBar } from '@/components/campus/GlobalStatusBar';
import { BuildingDetailPanel } from '@/components/campus/BuildingDetailPanel';
import { DeviceDetailPanel } from '@/components/campus/DeviceDetailPanel';
import { AIEventStream } from '@/components/campus/AIEventStream';
import { PredictionOverlay } from '@/components/campus/PredictionOverlay';
import { TimeMachineControl } from '@/components/campus/TimeMachineControl';
import { AIAssistantPanel } from '@/components/campus/AIAssistantPanel';
import { EnvironmentalPanel } from '@/components/campus/EnvironmentalPanel';
import { useWebXR } from '@/components/campus/WebXRSupport';
import { useCampusStore } from '@/store/campusStore';

// Dynamic import for Three.js scene (SSR disabled)
const CampusScene = dynamic(
  () => import('@/components/campus/CampusScene').then((m) => ({ default: m.CampusScene })),
  { ssr: false }
);

export default function CampusTwinPage() {
  const [showXRPanel, setShowXRPanel] = useState(false);
  const { xrState, requestSession, endSession } = useWebXR();
  const showDevices = useCampusStore((s) => s.showDevices);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#0a1628]">
      {/* Global Status Bar */}
      <GlobalStatusBar />

      {/* 3D Campus Scene */}
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1628]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-medium">Loading Campus Digital Twin...</span>
          </div>
        </div>
      }>
        <CampusScene />
      </Suspense>

      {/* Overlay Panels */}
      <BuildingDetailPanel />
      <DeviceDetailPanel />
      <EnvironmentalPanel />
      <AIEventStream />
      <PredictionOverlay />
      <TimeMachineControl />
      <AIAssistantPanel />

      {/* AR/VR Button */}
      {xrState.isSupported && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-20 left-4 z-20"
        >
          <button
            onClick={() => {
              if (xrState.isSessionActive) {
                endSession();
              } else {
                requestSession(xrState.deviceType === 'ar' ? 'immersive-ar' : 'immersive-vr');
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
              xrState.isSessionActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-cyan-500/30 hover:text-cyan-300'
            }`}
          >
            <span className="text-sm">{xrState.isSessionActive ? '🟢' : '🥽'}</span>
            {xrState.isSessionActive ? 'XR Active' : xrState.deviceType === 'ar' ? 'View in AR' : 'View in VR'}
          </button>
        </motion.div>
      )}

      {/* Performance & Privacy controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute bottom-4 left-1/2 translate-x-8 z-20"
      >
        <div className="backdrop-blur-xl bg-slate-900/60 rounded-xl border border-slate-700/30 px-3 py-1.5">
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <span>🖱 Orbit</span>
            <span>🔄 Scroll to zoom</span>
            <span>👆 Click buildings</span>
            {!showDevices && <span className="text-yellow-500">🔸 Devices hidden</span>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
