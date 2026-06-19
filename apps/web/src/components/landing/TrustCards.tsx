"use client";

import React from "react";
import { motion } from "framer-motion";

export function TrustCards() {
  return (
    <section className="w-full pb-32 bg-black px-6 pt-16">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-8">
         
         <div className="bg-[#111111] rounded-[2rem] p-12 relative overflow-hidden border border-white/10 group">
            <div className="relative z-10">
               <div className="flex gap-2 text-white/50 text-sm font-semibold mb-6 tracking-widest uppercase">
                  <span>SmartCampus</span> <span>/</span> <span>Intelligence</span>
               </div>
               <h3 className="text-4xl md:text-5xl font-medium text-white mb-8">
                  Your campus<br/>intelligence playbook.
               </h3>
               <button className="text-white font-medium flex items-center gap-2 text-sm border border-white/20 px-4 py-2 w-fit rounded-full hover:bg-white/10 transition-colors">
                  Read the playbook <span className="group-hover:translate-x-1 transition-transform">↗</span>
               </button>
            </div>
            
            <div className="absolute right-0 bottom-0 w-2/3 h-2/3 bg-gradient-to-tl from-white/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute -right-10 -bottom-10 w-[300px] h-[300px] bg-[url('https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 grayscale mix-blend-overlay rounded-full blur-2xl" />
         </div>

         <div className="bg-white rounded-[2rem] p-12 flex items-center justify-center relative overflow-hidden">
            <div className="grid grid-cols-2 gap-8 w-full z-10">
               <div className="flex flex-col items-center justify-center text-center p-4 border-r border-b border-black/10">
                  <span className="text-5xl font-bold text-black tracking-tighter mb-2">1M+</span>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Students Monitored</span>
               </div>
               <div className="flex flex-col items-center justify-center text-center p-4 border-b border-black/10">
                  <span className="text-5xl font-bold text-black tracking-tighter mb-2">50k</span>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Edge Cameras</span>
               </div>
               <div className="flex flex-col items-center justify-center text-center p-4 border-r border-black/10">
                  <span className="text-5xl font-bold text-black tracking-tighter mb-2">&lt;1s</span>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">AI Latency</span>
               </div>
               <div className="flex flex-col items-center justify-center text-center p-4">
                  <span className="text-5xl font-bold text-black tracking-tighter mb-2">99.9%</span>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">System Uptime</span>
               </div>
            </div>
            {/* Background minimal geometric pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
         </div>

      </div>
    </section>
  );
}
