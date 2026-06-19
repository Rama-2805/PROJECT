"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Cloud } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative w-full pt-48 pb-32 flex flex-col items-center justify-start overflow-hidden bg-[#060814]">
      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-30 z-0" />
      
      {/* Background waves mimicking the video but purely grayscale/white */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        {/* Subtle white abstract blob top right */}
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-blue-500/10 opacity-[0.25] blur-[120px] rounded-full mix-blend-screen" />
        {/* Subtle grey abstract blob center left */}
        <div className="absolute top-[20%] left-[-20%] w-[70vw] h-[50vw] bg-purple-500/10 opacity-[0.2] blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-gray-300 mb-6 uppercase tracking-widest bg-white/5">
            #1 AI University Operating System
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium text-white tracking-tight leading-[1.1] mb-6">
            One platform.<br/>360° campus intelligence.
          </h1>

          <p className="text-lg md:text-[22px] text-gray-400 font-light max-w-3xl mx-auto mb-10 leading-relaxed">
            Real-time face recognition, automatic attendance, and behavioral analytics for universities finally in one place.
          </p>

          <button className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl text-[15px] font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(255,255,255,0.1)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.2)]">
            Book a demo <ArrowUpRight className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Laptop Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-5xl relative mt-16"
        >
          <div className="relative w-full aspect-[16/10] bg-[#0A0A0A] rounded-t-[20px] border-[10px] border-[#1C1C1E] border-b-0 shadow-[0_0_50px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col">
            {/* Dashboard Mockup top bar */}
            <div className="h-10 bg-[#0c0f22] border-b border-white/10 flex items-center px-4 justify-between">
               <div className="flex gap-4 items-center">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#555555]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#777777]" />
                  </div>
                  <div className="flex items-center gap-2 text-white ml-4 text-xs font-semibold">
                    <Cloud className="w-4 h-4" />
                    <span>SmartCampus AI Control Center</span>
                  </div>
               </div>
            </div>
            {/* Body */}
            <div className="flex-1 bg-[#060814] p-6 flex flex-col gap-6 relative overflow-hidden">
               {/* Cyber grid inside laptop body */}
               <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-45" />
               
               {/* Sub Header */}
               <div className="flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
                 <div className="flex items-center gap-6">
                   <div className="bg-blue-500/15 border border-blue-500/20 text-blue-400 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">Live System Status</div>
                   <div className="text-sm font-semibold text-gray-400">Uptime: <span className="text-emerald-400">99.99%</span></div>
                   <div className="text-sm font-semibold text-gray-400">Security Level: <span className="text-blue-400">Maximum</span></div>
                 </div>
               </div>
               {/* Grid */}
               <div className="grid grid-cols-4 gap-4 relative z-10 text-left">
                  <div className="h-24 bg-[#090b16]/80 rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-blue-500/20 transition-colors">
                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Active AI Cameras</span>
                     <span className="text-2xl text-white font-bold tracking-tight">1,248 <span className="text-xs text-emerald-400 ml-2 font-semibold">↑ 12</span></span>
                  </div>
                  <div className="h-24 bg-[#090b16]/80 rounded-xl border border-white/5 p-4 flex flex-col justify-between relative overflow-hidden hover:border-cyan-500/20 transition-colors">
                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider z-10">Real-time Attendance</span>
                     <span className="text-2xl text-white font-bold tracking-tight z-10">94.2%</span>
                     <div className="absolute right-[-10px] bottom-[-10px] w-16 h-16 bg-cyan-500/5 rounded-full filter blur-md" />
                  </div>
                  <div className="h-24 bg-[#090b16]/80 rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-purple-500/20 transition-colors">
                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Student Engagement</span>
                     <span className="text-2xl text-white font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">High</span>
                  </div>
                  <div className="h-24 bg-[#090b16]/80 rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-emerald-500/20 transition-colors">
                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Security Alerts</span>
                     <span className="text-2xl text-emerald-400 font-bold tracking-tight">0</span>
                  </div>
               </div>
               <div className="flex-1 grid grid-cols-3 gap-6 relative z-10 text-left">
                 <div className="col-span-2 grid grid-cols-2 gap-4">
                   <div className="bg-[#090b16]/80 rounded-xl border border-white/5 p-4">
                     <span className="text-xs font-bold text-gray-300 block mb-4 uppercase tracking-wider">Campus Utilization <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] px-2 py-0.5 rounded-md ml-2 font-bold uppercase tracking-widest">Live</span></span>
                     <div className="space-y-4">
                       <div>
                         <div className="flex justify-between text-[10px] text-gray-400 mb-1.5 font-semibold"><span>Engineering Block</span><span>85%</span></div>
                         <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 w-[85%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" /></div>
                       </div>
                       <div>
                         <div className="flex justify-between text-[10px] text-gray-400 mb-1.5 font-semibold"><span>Science Center</span><span>60%</span></div>
                         <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 w-[60%] rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" /></div>
                       </div>
                     </div>
                   </div>
                   <div className="bg-[#090b16]/80 rounded-xl border border-white/5 p-4 flex items-center justify-center gap-6">
                      <div className="text-center">
                         <div className="w-24 h-24 rounded-full border-[6px] border-white/5 border-t-blue-500 border-r-blue-500 flex items-center justify-center mb-2 mx-auto shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                            <span className="text-xs font-bold text-white">15ms<br/><span className="text-[9px] font-normal text-gray-500 font-mono">Latency</span></span>
                         </div>
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Edge Processing</span>
                      </div>
                   </div>
                 </div>
                 <div className="bg-[#090b16]/80 rounded-xl border border-white/5 p-4">
                   <span className="text-xs font-bold text-gray-300 block mb-4 uppercase tracking-wider">System Health</span>
                   <div className="space-y-3">
                     <div className="flex justify-between text-xs font-semibold text-gray-400"><span>Facial Recognition</span> <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono">OK</span></div>
                     <div className="flex justify-between text-xs font-semibold text-gray-400"><span>IoT Gateways</span> <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono">OK</span></div>
                     <div className="flex justify-between text-xs font-semibold text-gray-400"><span>Digital Twin Sync</span> <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono">OK</span></div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
          {/* Laptop Base */}
          <div className="w-[110%] h-4 bg-[#111111] rounded-b-xl -ml-[5%] relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex justify-center">
             <div className="w-32 h-1 bg-[#222222] rounded-b-md" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
