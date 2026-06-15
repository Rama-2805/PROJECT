"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, Play, Pause, Square, AlertCircle, CheckCircle2, 
  Users, UserX, ScanFace, ChevronRight, Save
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type SessionState = "SETUP" | "LIVE" | "PAUSED" | "REVIEW";

export default function AIAttendanceSession() {
  const [sessionState, setSessionState] = useState<SessionState>("SETUP");
  const [stats, setStats] = useState({ present: 0, total: 65, accuracy: 99.2 });

  // Simulate AI Recognition over time
  useEffect(() => {
    if (sessionState === "LIVE") {
      const interval = setInterval(() => {
        setStats(prev => {
          if (prev.present >= prev.total) {
            clearInterval(interval);
            return prev;
          }
          // Fluctuate accuracy slightly
          const newAccuracy = 98 + Math.random() * 1.5;
          return { ...prev, present: prev.present + 1, accuracy: newAccuracy };
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [sessionState]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <ScanFace className="w-6 h-6 text-blue-400" />
            Live AI Attendance
          </h1>
          <p className="text-gray-400 text-sm mt-1">CS-301: Advanced Data Structures • Room 402</p>
        </div>
        
        {sessionState === "LIVE" && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm font-semibold tracking-wide">LIVE RECORDING</span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Left: Camera Feed */}
        <div className="col-span-1 lg:col-span-3 rounded-2xl border border-white/10 bg-black relative overflow-hidden flex flex-col">
          {sessionState === "SETUP" ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#0A0F1E] to-black">
              <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6">
                <Camera className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Camera Ready</h2>
              <p className="text-gray-400 text-center max-w-md mb-8">
                The Edge AI camera in Room 402 is online and ready. Ensure lighting is adequate before starting the session.
              </p>
              <button 
                onClick={() => setSessionState("LIVE")}
                className="flex items-center gap-3 px-8 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
              >
                <Play className="w-5 h-5 fill-current" />
                Start AI Session
              </button>
            </div>
          ) : (
            <>
              {/* Simulated Video Feed Area */}
              <div className="flex-1 relative bg-gray-900">
                {/* Fake Bounding Boxes */}
                {sessionState === "LIVE" && (
                  <div className="absolute inset-0 pointer-events-none p-10 grid grid-cols-4 grid-rows-3 gap-8 opacity-50">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: i < stats.present / 5 ? 1 : 0, scale: 1 }}
                        className="border-2 border-emerald-500 rounded-lg relative"
                      >
                        <div className="absolute -top-6 left-0 bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded">
                          STU-{1000 + i} • 99%
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center text-gray-700 pointer-events-none">
                  <Camera className="w-32 h-32 opacity-20" />
                </div>
              </div>

              {/* Controls Bar */}
              <div className="h-20 bg-[#0A0F1E] border-t border-white/10 flex items-center justify-center gap-4 px-6 shrink-0">
                {sessionState === "LIVE" ? (
                  <>
                    <button 
                      onClick={() => setSessionState("PAUSED")}
                      className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <Pause className="w-5 h-5 fill-current" />
                    </button>
                    <button 
                      onClick={() => setSessionState("REVIEW")}
                      className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                    >
                      <Square className="w-5 h-5 fill-current" />
                    </button>
                  </>
                ) : sessionState === "PAUSED" ? (
                  <>
                    <button 
                      onClick={() => setSessionState("LIVE")}
                      className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    >
                      <Play className="w-5 h-5 fill-current ml-1" />
                    </button>
                    <button 
                      onClick={() => setSessionState("REVIEW")}
                      className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <Square className="w-5 h-5 fill-current" />
                    </button>
                  </>
                ) : (
                  <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500">
                    <Save className="w-4 h-4" /> Finalize Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Telemetry & Stats */}
        <div className="col-span-1 flex flex-col gap-6">
          
          {/* Main Counter Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/20 to-[#0A0F1E] border border-blue-500/20 backdrop-blur-md">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Live Counter</h3>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white">{stats.present}</span>
              <span className="text-xl text-gray-500 mb-1">/ {stats.total}</span>
            </div>
            
            <div className="mt-6 w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500 rounded-full"
                animate={{ width: `${(stats.present / stats.total) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* AI Telemetry */}
          <div className="p-6 rounded-2xl bg-[#0A0F1E]/80 border border-white/10 backdrop-blur-md flex-1">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-6">AI Telemetry</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Model Accuracy</span>
                  <span className="text-emerald-400 font-medium">{stats.accuracy.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-emerald-500 rounded-full" animate={{ width: `${stats.accuracy}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-yellow-400"/> Unknown Faces</span>
                  <span className="text-yellow-400 font-medium">0</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 flex items-center gap-2"><UserX className="w-4 h-4 text-red-400"/> Absent Students</span>
                  <span className="text-red-400 font-medium">{stats.total - stats.present}</span>
                </div>
              </div>
            </div>
            
            {sessionState === "REVIEW" && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm font-medium text-white hover:bg-white/10 transition-colors group">
                  Manual Override
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
