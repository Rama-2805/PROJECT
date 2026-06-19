"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Network, Cpu, History, Zap, CheckCircle2, 
  AlertCircle, ArrowRightLeft, Database, UploadCloud
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AIModel {
  id: string;
  name: string;
  version: string;
  type: string;
  accuracy: number;
  latency: number;
  status: "ACTIVE" | "TRAINING" | "DEPRECATED";
  releaseDate: string;
}

const MOCK_MODELS: AIModel[] = [
  { id: "mod-01", name: "CampusFace Pro", version: "v2.1.0", type: "Facial Recognition", accuracy: 99.4, latency: 110, status: "ACTIVE", releaseDate: "Oct 12, 2024" },
  { id: "mod-02", name: "CampusFace Edge", version: "v2.0.5", type: "Facial Recognition", accuracy: 98.7, latency: 45, status: "ACTIVE", releaseDate: "Sep 05, 2024" },
  { id: "mod-03", name: "Behavior Analytics", version: "v1.5.0", type: "Action Recognition", accuracy: 94.2, latency: 250, status: "TRAINING", releaseDate: "Pending" },
  { id: "mod-04", name: "CampusFace Legacy", version: "v1.9.0", type: "Facial Recognition", accuracy: 96.5, latency: 180, status: "DEPRECATED", releaseDate: "Jan 15, 2024" },
];

export default function AIModelRegistry() {
  const [activeModel, setActiveModel] = useState(MOCK_MODELS[0].id);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-400" />
            AI Model Registry
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage, deploy, and monitor neural networks across the edge infrastructure.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors">
            <History className="w-4 h-4" /> View Rollbacks
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors">
            <UploadCloud className="w-4 h-4" /> Upload Weights
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Model List */}
        <div className="col-span-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
          {MOCK_MODELS.map(model => (
            <motion.button
              key={model.id}
              onClick={() => setActiveModel(model.id)}
              className={cn(
                "w-full text-left p-5 rounded-2xl border transition-all relative overflow-hidden",
                activeModel === model.id 
                  ? "bg-blue-600/10 border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.1)]" 
                  : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
              )}
            >
              {activeModel === model.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
              )}
              
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white text-lg">{model.name}</h3>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold border",
                  model.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  model.status === "TRAINING" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                  "bg-gray-500/10 text-gray-400 border-gray-500/20"
                )}>
                  {model.status}
                </span>
              </div>
              
              <div className="text-sm text-gray-400 font-mono mb-4">{model.version} • {model.type}</div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {model.accuracy}% Acc
                </div>
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Zap className="w-4 h-4 text-yellow-400" /> {model.latency}ms Latency
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Right Column: Model Details & Actions */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl border border-white/10 bg-[#0A0F1E]/80 backdrop-blur-md overflow-hidden flex flex-col">
          {MOCK_MODELS.filter(m => m.id === activeModel).map(model => (
            <motion.div 
              key={model.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Cover Header */}
              <div className="h-48 bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-b border-white/10 p-8 flex items-end relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                <div className="relative z-10 w-full flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">
                        {model.type}
                      </span>
                      <span className="text-sm text-gray-400 font-mono">{model.id}</span>
                    </div>
                    <h2 className="text-4xl font-black text-white">{model.name}</h2>
                    <p className="text-gray-300 mt-2 font-mono text-lg">{model.version} • Released {model.releaseDate}</p>
                  </div>
                  
                  {model.status === "ACTIVE" && (
                    <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 font-bold transition-all">
                      <AlertCircle className="w-5 h-5" /> Deactivate Model
                    </button>
                  )}
                  {model.status === "DEPRECATED" && (
                    <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all">
                      <ArrowRightLeft className="w-5 h-5" /> Rollback to {model.version}
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-8 grid grid-cols-3 gap-6">
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Top-1 Accuracy</div>
                  <div className="text-4xl font-light text-white">{model.accuracy}<span className="text-2xl text-gray-500">%</span></div>
                  <div className="mt-4 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${model.accuracy}%` }} />
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Inference Latency</div>
                  <div className="text-4xl font-light text-white">{model.latency}<span className="text-2xl text-gray-500">ms</span></div>
                  <div className="mt-4 text-sm text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Highly Optimized
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Parameters</div>
                  <div className="text-4xl font-light text-white">45<span className="text-2xl text-gray-500">M</span></div>
                  <div className="mt-4 text-sm text-gray-400 flex items-center gap-1">
                    <Database className="w-4 h-4" /> INT8 Quantized
                  </div>
                </div>
              </div>

              {/* Performance Graph Mock */}
              <div className="px-8 flex-1 flex flex-col mb-8">
                <h3 className="text-lg font-bold text-white mb-4">Inference Performance Profile</h3>
                <div className="flex-1 border border-white/10 rounded-xl bg-black/50 p-6 flex items-end gap-2 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 border-t border-b border-white/5 flex flex-col justify-between pointer-events-none">
                    <div className="w-full border-t border-white/5 h-1/4" />
                    <div className="w-full border-t border-white/5 h-1/4" />
                    <div className="w-full border-t border-white/5 h-1/4" />
                  </div>
                  
                  {/* Mock Bars */}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div 
                      key={i}
                      className="flex-1 bg-gradient-to-t from-purple-600/50 to-blue-500/80 rounded-t-sm"
                      style={{ height: `${40 + Math.random() * 50}%`, opacity: 0.8 }}
                    />
                  ))}
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
