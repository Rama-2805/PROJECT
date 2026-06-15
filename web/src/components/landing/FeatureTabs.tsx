"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  "Automatic Attendance",
  "Computer Vision",
  "Digital Twin",
  "IoT Device Management",
  "Advanced Analytics",
  "AI Agents",
  "Mobile Ecosystem",
  "Enterprise Security"
];

const tabContent: Record<string, { title: string, desc: string, points: string[] }> = {
  "Automatic Attendance": {
    title: "Automatic Attendance",
    desc: "Eliminate manual roll calls. AI cameras recognize students instantly and sync with your academic system in real-time.",
    points: ["Sub-second facial recognition", "Liveness detection", "API integration with SIS", "Automated parent notifications"]
  },
  "Computer Vision": {
    title: "Computer Vision",
    desc: "Monitor campus safety, track high-density areas, and detect anomalies using existing security cameras upgraded with edge AI.",
    points: ["Anomaly detection", "Crowd density heatmaps", "Unregistered visitor alerts", "Weapon detection protocols"]
  },
  "Digital Twin": {
    title: "Digital Twin",
    desc: "A precise 3D virtual model of your university campus, fed by live IoT data for spatial intelligence and facility management.",
    points: ["Real-time 3D visualization", "HVAC integration", "Space utilization metrics", "Emergency simulation"]
  },
  "IoT Device Management": {
    title: "IoT Device Management",
    desc: "Control thousands of edge devices, cameras, smart locks, and sensors from a single, unified dashboard.",
    points: ["Over-the-air (OTA) updates", "Device health monitoring", "Automated reboot scripts", "Bandwidth optimization"]
  },
  "Advanced Analytics": {
    title: "Advanced Analytics",
    desc: "Transform raw data into actionable intelligence. Correlate attendance, behavior, and grades to predict student success.",
    points: ["Predictive dropout models", "Engagement scoring", "Custom KPI dashboards", "Automated weekly reports"]
  },
  "AI Agents": {
    title: "AI Agents",
    desc: "Deploy intelligent assistants for students and faculty that can answer campus queries, schedule meetings, and assist with coursework.",
    points: ["24/7 student support", "Canvas/Blackboard integration", "Personalized tutoring paths", "Faculty admin automation"]
  },
  "Mobile Ecosystem": {
    title: "Mobile Ecosystem",
    desc: "A seamless, glass-morphic mobile app giving students their digital ID, schedules, and campus map right in their pocket.",
    points: ["Digital Student ID (NFC)", "Live transit tracking", "Push notifications", "Campus wayfinding"]
  },
  "Enterprise Security": {
    title: "Enterprise Security",
    desc: "Military-grade encryption and zero-trust architecture ensure that sensitive biometric and academic data is never compromised.",
    points: ["AES-256 encryption", "Row-Level Security (RLS)", "SOC 2 Type II compliance", "Granular RBAC"]
  }
};

export function FeatureTabs() {
  const [activeTab, setActiveTab] = useState("Automatic Attendance");

  return (
    <section id="solutions" className="w-full py-32 bg-black px-6 border-t border-white/10">
      <div className="max-w-[1400px] mx-auto flex flex-col items-center">
        <div className="inline-flex px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-gray-300 mb-6 uppercase tracking-widest bg-white/5">
          [ Core Ecosystem ]
        </div>
        <h2 className="text-4xl md:text-6xl font-medium text-white mb-16 text-center tracking-tight">
          Capabilities designed for intelligent education
        </h2>

        <div className="flex flex-wrap justify-center gap-3 mb-16 max-w-4xl mx-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                activeTab === tab 
                  ? "bg-white text-black border-white" 
                  : "bg-transparent text-gray-400 border-white/10 hover:border-white/30 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="w-full bg-[#111111] rounded-[2rem] p-12 md:p-16 flex flex-col md:flex-row items-center gap-16 text-white overflow-hidden relative min-h-[500px] border border-white/10">
          <div className="md:w-1/2 relative z-10 flex flex-col items-start">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">{tabContent[activeTab].title}</h3>
                <p className="text-[18px] text-gray-400 leading-relaxed mb-8 max-w-md">
                  {tabContent[activeTab].desc}
                </p>
                <ul className="grid grid-cols-2 gap-y-4 gap-x-8 mb-10 w-full text-sm font-medium text-gray-300">
                   {tabContent[activeTab].points.map((pt, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0" />
                        {pt}
                      </li>
                   ))}
                </ul>
                <button className="text-white font-semibold flex items-center gap-2 group text-sm hover:text-gray-300 transition-colors border border-white/20 px-6 py-2 rounded-full">
                  Learn more 
                  <span className="group-hover:translate-x-1 transition-transform">↗</span>
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="md:w-1/2 relative z-10 h-full flex items-center justify-center">
            {/* Laptop Mockup Right Side */}
             <div className="w-[120%] relative -mr-[20%]">
                <div className="w-full aspect-[16/10] bg-[#0A0A0A] rounded-l-[20px] rounded-r-none border-[8px] border-[#1C1C1E] border-r-0 shadow-2xl overflow-hidden flex flex-col">
                   <div className="h-8 bg-[#111111] border-b border-white/10 flex items-center px-4 gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#333333]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#555555]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#777777]" />
                   </div>
                   <div className="flex-1 bg-black p-6 border-l border-white/5">
                      <div className="w-full h-8 bg-white/10 rounded mb-4 animate-pulse" />
                      <div className="w-3/4 h-8 bg-white/10 rounded mb-4 animate-pulse" />
                      <div className="w-full h-32 bg-white/5 border border-white/10 rounded" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
