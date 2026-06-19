"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cloud, Play } from "lucide-react";

export function InteractiveDashboard() {
  return (
    <section id="technology" className="w-full py-32 bg-transparent px-6 flex flex-col items-center overflow-hidden border-t border-white/5">
      {/* Cyber Grid Overlay inside technology section */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-30" />

      <div className="text-center mb-16 max-w-4xl relative z-10">
        <div className="inline-flex px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-gray-300 mb-6 uppercase tracking-widest bg-white/5">
          [ AI Control Center ]
        </div>
        <h2 className="text-5xl md:text-7xl font-medium text-white tracking-tight mb-8">
          Welcome to your campus command center
        </h2>
        <p className="text-[20px] text-gray-400 leading-relaxed max-w-3xl mx-auto font-light">
          With our AI-powered operating system, you get a real-time view of live camera feeds, edge device status, automatic attendance, and security alerts. Drill into the data in seconds. When the administration can see what's happening, you stop reacting and take control.
        </p>
      </div>

      <motion.div 
        className="w-full max-w-6xl relative z-10"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="relative w-full aspect-[16/10] bg-[#0A0A0A] rounded-[20px] border-[1px] border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {/* Top Bar */}
          <div className="h-10 bg-[#0c0f22] border-b border-white/10 flex items-center px-4 justify-between">
             <div className="flex gap-4 items-center">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#555555]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#777777]" />
                </div>
                <div className="flex items-center gap-2 text-white ml-4 text-xs font-semibold">
                  <Cloud className="w-4 h-4" />
                  <span>SmartCampus OS</span>
                </div>
             </div>
          </div>
          
          {/* Main Dashboard Area */}
          <div className="p-6 bg-[#060814] h-full relative border-x border-b border-white/5">
             <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-30" />
             
             {/* Center tooltip */}
             <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                 <div className="bg-[#090b16]/90 border border-white/10 backdrop-blur-[35px] text-white p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col items-center text-center max-w-md w-[400px]">
                    <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">This is your command center</h3>
                    <p className="text-sm text-gray-400 mb-6 font-medium">Get a real-time view of every AI event</p>
                    <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider w-full transition-all shadow-[0_4px_12px_rgba(59,130,246,0.2)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer">
                       Start Tour
                    </button>
                 </div>
                 {/* Pointer triangle */}
                 <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[15px] border-t-[#090b16]/90 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
             </div>

             {/* Faded Dashboard content underneath */}
             <div className="opacity-30 blur-[2px]">
                {/* Sub Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <div className="flex items-center gap-6">
                    <div className="bg-white/10 text-white px-3 py-1 rounded text-xs font-semibold">Campus Wide View</div>
                    <div className="text-sm font-medium text-gray-400">Total Students: 34,250</div>
                    <div className="text-sm font-medium text-gray-400">Active Sensors: 4,102</div>
                  </div>
                </div>
                {/* Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                   <div className="h-24 bg-[#090b16]/80 rounded-xl border border-white/10 p-4 flex flex-col justify-between">
                      <span className="text-xs text-gray-400 font-medium">Daily Attendance</span>
                      <span className="text-2xl text-white font-semibold">94.2%</span>
                   </div>
                   <div className="h-24 bg-[#090b16]/80 rounded-xl border border-white/10 p-4 flex flex-col justify-between">
                      <span className="text-xs text-gray-400 font-medium">Active Classrooms</span>
                      <span className="text-2xl text-white font-semibold">142</span>
                   </div>
                   <div className="h-24 bg-[#090b16]/80 rounded-xl border border-white/10 p-4 flex flex-col justify-between">
                      <span className="text-xs text-gray-400 font-medium">Network Latency</span>
                      <span className="text-2xl text-white font-semibold">12ms</span>
                   </div>
                   <div className="h-24 bg-[#090b16]/80 rounded-xl border border-white/10 p-4 flex flex-col justify-between">
                      <span className="text-xs text-gray-400 font-medium">Pending Alerts</span>
                      <span className="text-2xl text-white font-semibold">0</span>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
             <button className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-full flex items-center gap-2 shadow-[0_10px_30px_rgba(255,255,255,0.15)] transition-colors cursor-pointer">
               <span className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                 <Play className="w-3 h-3 text-white fill-white ml-0.5" />
               </span>
               <span className="font-semibold text-sm">Replay Demo</span>
             </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
