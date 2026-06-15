"use client";

import React from "react";
import { GraduationCap, Zap, Layers, Server, Shield, Activity } from "lucide-react";

export function HowWeAreDifferent() {
  const points = [
    {
      icon: <GraduationCap className="w-5 h-5 text-black" />,
      title: "Purpose-built for Universities",
      desc: "Not a repurposed corporate HR tool. SmartCampus is engineered exclusively for the scale and complexity of higher education."
    },
    {
      icon: <Layers className="w-5 h-5 text-black" />,
      title: "Clean Architecture",
      desc: "Built on SOLID principles. A Next.js and NestJS stack that enterprise IT teams love to maintain and integrate with."
    },
    {
      icon: <Zap className="w-5 h-5 text-black" />,
      title: "Sub-second AI Latency",
      desc: "Our computer vision models run at the edge, identifying students and logging attendance in under 200 milliseconds."
    },
    {
      icon: <Server className="w-5 h-5 text-black" />,
      title: "Massive Scalability",
      desc: "Designed to handle 100,000+ students, thousands of concurrent edge cameras, and millions of real-time AI events without sweat."
    },
    {
      icon: <Shield className="w-5 h-5 text-black" />,
      title: "Zero-trust Security",
      desc: "Military-grade encryption for biometric data. Complete Row-Level Security (RLS) ensures absolute data isolation between departments."
    },
    {
      icon: <Activity className="w-5 h-5 text-black" />,
      title: "95+ Performance",
      desc: "A futuristic Apple-like glassmorphic interface that doesn't compromise on speed. Perfect Lighthouse scores across the board."
    }
  ];

  return (
    <section className="w-full py-32 bg-black px-6 border-t border-white/10 relative overflow-hidden">
      {/* Background architectural grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '50px 50px' }} 
      />

      <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row gap-16 lg:gap-32 justify-between">
        <div className="md:w-1/3 flex flex-col items-start">
           <div className="inline-flex px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-gray-300 mb-6 uppercase tracking-widest bg-white/5">
             [ Engineering Excellence ]
           </div>
           <h2 className="text-4xl md:text-5xl font-medium text-white leading-tight mb-8">
             How we're fundamentally different
           </h2>
           <button className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl text-[15px] font-semibold transition-colors mt-auto">
             Read our documentation
           </button>
        </div>

        <div className="md:w-2/3 grid sm:grid-cols-2 gap-x-12 gap-y-16">
          {points.map((pt, i) => (
             <div key={i} className="flex flex-col">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center mb-4">
                   {pt.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{pt.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{pt.desc}</p>
             </div>
          ))}
        </div>
      </div>
    </section>
  );
}
