"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface Dataset {
  id: string;
  name: string;
  description: string;
  datasetType: string;
  sampleCount: number;
  classCount: number;
  qualityScore: number;
  source: string;
  status: string;
  isPublic: boolean;
  versions: { version: string; sampleCount: number; createdAt: Date }[];
  createdAt: Date;
}

const MOCK_DATASETS: Dataset[] = [
  {
    id: "ds-1", name: "Student Face Dataset v2", description: "Curated face images of 500 students across 8 departments under varying lighting conditions",
    datasetType: "FACE", sampleCount: 12500, classCount: 500, qualityScore: 0.94,
    source: "UPLOADED", status: "ACTIVE", isPublic: false,
    versions: [{ version: "2.0.0", sampleCount: 12500, createdAt: new Date("2025-06-01") }, { version: "1.0.0", sampleCount: 8000, createdAt: new Date("2025-03-15") }],
    createdAt: new Date("2025-03-15"),
  },
  {
    id: "ds-2", name: "Classroom Behavior Dataset", description: "Behavior annotations from 30+ classrooms including phone usage, sleeping, distraction events",
    datasetType: "BEHAVIOR", sampleCount: 45000, classCount: 6, qualityScore: 0.91,
    source: "UPLOADED", status: "ACTIVE", isPublic: false,
    versions: [{ version: "1.0.0", sampleCount: 45000, createdAt: new Date("2025-04-20") }],
    createdAt: new Date("2025-04-20"),
  },
  {
    id: "ds-3", name: "Synthetic Augmentation Set", description: "Synthetically generated face images with varied lighting, angles, and occlusion for robustness",
    datasetType: "SYNTHETIC", sampleCount: 20000, classCount: 500, qualityScore: 0.87,
    source: "GENERATED", status: "ACTIVE", isPublic: true,
    versions: [{ version: "1.0.0", sampleCount: 20000, createdAt: new Date("2025-05-10") }],
    createdAt: new Date("2025-05-10"),
  },
  {
    id: "ds-4", name: "Classroom Activity Frames", description: "Raw classroom frame captures for activity recognition model training",
    datasetType: "CLASSROOM_ACTIVITY", sampleCount: 85000, classCount: 12, qualityScore: 0.83,
    source: "UPLOADED", status: "PROCESSING", isPublic: false,
    versions: [{ version: "0.1.0", sampleCount: 85000, createdAt: new Date("2025-06-08") }],
    createdAt: new Date("2025-06-08"),
  },
];

const TYPE_ICONS: Record<string, string> = {
  FACE: "👤", BEHAVIOR: "🧠", CLASSROOM_ACTIVITY: "🏫", SYNTHETIC: "🔧",
};

const TYPE_COLORS: Record<string, string> = {
  FACE: "text-ai-blue border-ai-blue/20 bg-ai-blue/5",
  BEHAVIOR: "text-ai-purple border-ai-purple/20 bg-ai-purple/5",
  CLASSROOM_ACTIVITY: "text-success border-success/20 bg-success/5",
  SYNTHETIC: "text-warning border-warning/20 bg-warning/5",
};

const TYPE_LABELS: Record<string, string> = {
  FACE: "Face Recognition", BEHAVIOR: "Behavior Analysis", CLASSROOM_ACTIVITY: "Classroom Activity", SYNTHETIC: "Synthetic",
};

export default function AIDatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>("all");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    setTimeout(() => { setDatasets(MOCK_DATASETS); setLoading(false); }, 300);
  }, []);

  const filtered = activeType === "all" ? datasets : datasets.filter(d => d.datasetType === activeType);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Dataset Library</h2>
          <p className="text-xs text-text-muted">Manage, version, and curate AI training datasets</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Dataset
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Total Datasets</p>
          <p className="text-xl font-bold text-text-primary tabular-nums">{datasets.length}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Total Samples</p>
          <p className="text-xl font-bold text-ai-blue tabular-nums">{datasets.reduce((a, d) => a + d.sampleCount, 0).toLocaleString()}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Avg Quality Score</p>
          <p className="text-xl font-bold text-success tabular-nums">
            {datasets.length ? (datasets.reduce((a, d) => a + d.qualityScore, 0) / datasets.length * 100).toFixed(0) : 0}%
          </p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-0.5">Public Datasets</p>
          <p className="text-xl font-bold text-warning tabular-nums">{datasets.filter(d => d.isPublic).length}</p>
        </GlassCard>
      </div>

      {/* Type Filter */}
      <div className="flex gap-1.5 p-1 mb-6 glass rounded-xl border border-glass-border w-fit">
        {[{ id: "all", label: "All Types" }, { id: "FACE", label: "Face" }, { id: "BEHAVIOR", label: "Behavior" }, { id: "CLASSROOM_ACTIVITY", label: "Classroom" }, { id: "SYNTHETIC", label: "Synthetic" }].map(f => (
          <button key={f.id} onClick={() => setActiveType(f.id)} className={cn(
            "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all",
            activeType === f.id ? "bg-ai-blue text-black font-semibold" : "text-text-dim hover:text-text-primary",
          )}>{f.label}</button>
        ))}
      </div>

      {/* Upload Form */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Create New Dataset</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1 block">Dataset Name</label>
                  <input className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-ai-blue/50" placeholder="e.g., Nightlight Face Dataset" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1 block">Dataset Type</label>
                  <select className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary focus:outline-none focus:border-ai-blue/50">
                    <option>FACE</option><option>BEHAVIOR</option><option>CLASSROOM_ACTIVITY</option><option>SYNTHETIC</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-medium text-text-muted mb-1 block">Description</label>
                  <textarea className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-ai-blue/50 resize-none h-20" placeholder="Describe the dataset..." />
                </div>
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
                <Button size="sm">Create Dataset</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dataset Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading datasets...</span></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((dataset, i) => (
            <motion.div key={dataset.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="group hover:border-ai-blue/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{TYPE_ICONS[dataset.datasetType]}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{dataset.name}</h3>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", TYPE_COLORS[dataset.datasetType])}>
                        {TYPE_LABELS[dataset.datasetType]}
                      </span>
                    </div>
                  </div>
                  <div className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                    dataset.status === "ACTIVE" ? "bg-success/10 text-success border border-success/20" : "bg-warning/10 text-warning border border-warning/20",
                  )}>
                    {dataset.status}
                  </div>
                </div>

                <p className="text-[11px] text-text-secondary mb-3 line-clamp-2">{dataset.description}</p>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2 rounded-lg glass">
                    <p className="text-xs font-bold text-text-primary tabular-nums">{dataset.sampleCount.toLocaleString()}</p>
                    <p className="text-[9px] text-text-muted">Samples</p>
                  </div>
                  <div className="text-center p-2 rounded-lg glass">
                    <p className="text-xs font-bold text-text-primary tabular-nums">{dataset.classCount}</p>
                    <p className="text-[9px] text-text-muted">Classes</p>
                  </div>
                  <div className="text-center p-2 rounded-lg glass">
                    <p className="text-xs font-bold text-success tabular-nums">{(dataset.qualityScore * 100).toFixed(0)}%</p>
                    <p className="text-[9px] text-text-muted">Quality</p>
                  </div>
                </div>

                {/* Versions */}
                <div className="border-t border-glass-border pt-2 mt-2">
                  <p className="text-[9px] font-medium text-text-muted mb-1.5 uppercase tracking-wider">Versions</p>
                  <div className="space-y-1">
                    {dataset.versions.map(v => (
                      <div key={v.version} className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-ai-blue shrink-0" />
                          <span className="font-mono text-text-primary">{v.version}</span>
                        </div>
                        <span className="text-text-muted">{v.sampleCount.toLocaleString()} samples</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-glass-border">
                  <button className="flex items-center gap-1 text-[10px] text-ai-blue hover:text-ai-blue/80 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Export
                  </button>
                  <button className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    Annotate
                  </button>
                  <button className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary transition-colors ml-auto">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    Archive
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
