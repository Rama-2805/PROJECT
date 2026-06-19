"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Brain, TrendingUp, AlertTriangle, 
  Clock, Shield, CheckCircle2, XCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = ["Overview", "Attendance", "Performance", "AI Profile", "Behavior", "Security Logs"];

export default function StudentProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/dashboard/students')}
          className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Student Profile</h1>
          <p className="text-sm text-gray-400 mt-1">AI Intelligence & Academic Records</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Identity & Status */}
        <div className="col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0A0F1E]/80 border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-3 h-3" /> ACTIVE
              </span>
            </div>

            <div className="flex flex-col items-center mt-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-1">
                <div className="w-full h-full rounded-full border-2 border-[#0A0F1E] overflow-hidden bg-gray-800 flex items-center justify-center">
                  {/* Photo Placeholder */}
                  <span className="text-2xl font-bold text-white">JD</span>
                </div>
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">John Doe</h2>
              <p className="text-sm text-gray-400">STU-10024</p>
              
              <div className="mt-6 w-full space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Department</span>
                  <span className="text-gray-200 font-medium">Computer Science</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Semester</span>
                  <span className="text-gray-200 font-medium">6th Semester</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Admission</span>
                  <span className="text-gray-200 font-medium">Aug 2023</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white">AI Campus Brain</h3>
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-200">
                  <span className="font-bold text-red-400">Alert:</span> Student attendance has decreased by 12% over the previous month.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-200">
                  <span className="font-bold text-yellow-400">Insight:</span> Low engagement detected during afternoon Data Structures classes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Tabs & Data */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex overflow-x-auto custom-scrollbar gap-2 p-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/50" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 rounded-2xl bg-[#0A0F1E]/80 border border-white/10 backdrop-blur-md min-h-[500px]">
            {activeTab === "Overview" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                
                {/* Metric Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Attendance</div>
                    <div className="text-2xl font-bold text-white">88.5%</div>
                    <div className="text-xs text-red-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 rotate-180" /> -12% this month</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Engagement</div>
                    <div className="text-2xl font-bold text-white">92.0%</div>
                    <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +2% this month</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Behavior Score</div>
                    <div className="text-2xl font-bold text-white">98/100</div>
                    <div className="text-xs text-gray-500 mt-1">Excellent</div>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="text-red-300 text-xs uppercase tracking-wider mb-1">Risk Score</div>
                    <div className="text-2xl font-bold text-red-400">HIGH</div>
                    <div className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Action Required</div>
                  </div>
                </div>

                {/* Chart Area */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">30-Day Trend (AI Analysis)</h3>
                  <div className="h-64 w-full flex items-end gap-2 border-b border-l border-white/20 p-4 pb-0 relative">
                    {/* Mock CSS Bar Chart */}
                    <div className="flex-1 bg-blue-500/80 h-[80%] rounded-t-sm" />
                    <div className="flex-1 bg-emerald-500/80 h-[100%] rounded-t-sm" />
                    <div className="flex-1 bg-blue-500/80 h-[85%] rounded-t-sm" />
                    <div className="flex-1 bg-emerald-500/80 h-[95%] rounded-t-sm" />
                    <div className="flex-1 bg-blue-500/80 h-[90%] rounded-t-sm" />
                  </div>
                </div>

              </motion.div>
            )}
            
            {activeTab !== "Overview" && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                <Clock className="w-12 h-12 mb-4 opacity-50" />
                <p>This module is currently generating real-time data...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
