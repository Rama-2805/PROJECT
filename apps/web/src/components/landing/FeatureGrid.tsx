"use client";

import React from "react";
import { motion } from "framer-motion";
import { ScanFace, Activity, ShieldAlert, Laptop, Eye, Network, ArrowUpRight } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function FeatureGrid() {
  const setDemoModalOpen = useUIStore((s) => s.setDemoModalOpen);
  const features = [
    {
      icon: <ScanFace className="w-6 h-6 text-white" />,
      title: "Real-time Face Recognition",
      desc: "Frictionless, automatic attendance tracking. Students simply walk into the classroom, and our edge AI cameras identify and log attendance with millisecond latency."
    },
    {
      icon: <Activity className="w-6 h-6 text-white" />,
      title: "Behavioral Analytics",
      desc: "Deep insights into student engagement. Monitor classroom dynamics, focus levels, and active participation without interrupting the educational flow."
    },
    {
      icon: <Network className="w-6 h-6 text-white" />,
      title: "Edge Computing",
      desc: "Process AI models directly on local devices. Reduce bandwidth, eliminate latency, and ensure that facial data never leaves your secure campus network."
    },
    {
      icon: <Laptop className="w-6 h-6 text-white" />,
      title: "Digital Twin Campus",
      desc: "A 3D virtual replication of your entire university. Monitor building utilization, HVAC systems, and crowd density in real-time."
    },
    {
      icon: <Eye className="w-6 h-6 text-white" />,
      title: "AI Agent Assistants",
      desc: "Automated help and scheduling for students and faculty. Give everyone their own AI assistant to navigate campus life and academic requirements."
    },
    {
      icon: <ShieldAlert className="w-6 h-6 text-white" />,
      title: "Enterprise Security",
      desc: "Zero-trust architecture with complete privacy control. Role-based access, encrypted biometric data, and proactive threat detection."
    }
  ];

  return (
    <section id="features" className="w-full py-32 bg-black px-6">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-16 justify-between items-start">
        <div className="lg:w-1/3 flex flex-col items-start sticky top-32">
          <div className="inline-flex px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-gray-300 mb-6 tracking-widest uppercase bg-white/5">
            [ Computer Vision & IoT ]
          </div>
          <h2 className="text-5xl md:text-6xl font-medium text-white leading-[1.1] tracking-tight mb-8">
            Power your institution with real-time AI
          </h2>
          <button 
            onClick={() => setDemoModalOpen(true)}
            className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl text-[15px] font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            Book a demo <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>

        <div className="lg:w-3/5 grid md:grid-cols-2 gap-x-12 gap-y-20">
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex flex-col gap-4"
            >
              <div className="mb-2 p-3 bg-white/10 rounded-lg w-fit border border-white/10">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-medium text-white tracking-tight">{feature.title}</h3>
              <p className="text-gray-400 text-[15px] leading-relaxed mt-2">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
