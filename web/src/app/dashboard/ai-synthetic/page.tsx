"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface AugmentationConfig {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  intensity: number;
}

interface SyntheticJob {
  id: string;
  name: string;
  modelType: string;
  sampleCount: number;
  augmentations: string[];
  status: "GENERATING" | "COMPLETED" | "FAILED";
  progress: number;
  createdAt: Date;
  completedAt: Date | null;
}

const DEFAULT_AUGMENTATIONS: AugmentationConfig[] = [
  { id: "brightness", label: "Brightness Variation", description: "Simulate different lighting conditions from dark to overexposed", enabled: true, intensity: 70 },
  { id: "rotation", label: "Camera Angle Rotation", description: "Generate images at ±30° rotation for profile/angle robustness", enabled: true, intensity: 60 },
  { id: "occlusion", label: "Partial Occlusion", description: "Simulate objects blocking parts of the face (hands, books, masks)", enabled: true, intensity: 40 },
  { id: "noise", label: "Sensor Noise", description: "Add gaussian noise to simulate low-light camera conditions", enabled: true, intensity: 30 },
  { id: "blur", label: "Motion Blur", description: "Simulate camera motion or student movement during capture", enabled: true, intensity: 35 },
  { id: "flip", label: "Horizontal Flip", description: "Mirror images for data balancing across orientations", enabled: true, intensity: 50 },
  { id: "contrast", label: "Contrast Adjustment", description: "Vary contrast levels for different classroom lighting setups", enabled: false, intensity: 50 },
  { id: "color_shift", label: "Color Temperature Shift", description: "Simulate different white balance conditions", enabled: false, intensity: 40 },
];

const MOCK_JOBS: SyntheticJob[] = [
  { id: "sj-1", name: "Face Augmentation v1", modelType: "FACE_RECOGNITION", sampleCount: 20000, augmentations: ["brightness", "rotation", "occlusion", "noise"], status: "COMPLETED", progress: 100, createdAt: new Date("2025-05-10"), completedAt: new Date("2025-05-10") },
  { id: "sj-2", name: "Behavior Variation Set", modelType: "BEHAVIOR", sampleCount: 15000, augmentations: ["brightness", "blur", "contrast"], status: "COMPLETED", progress: 100, createdAt: new Date("2025-05-25"), completedAt: new Date("2025-05-26") },
  { id: "sj-3", name: "Low-Light Robustness Pack", modelType: "FACE_RECOGNITION", sampleCount: 10000, augmentations: ["brightness", "noise", "blur"], status: "GENERATING", progress: 62, createdAt: new Date("2025-06-14"), completedAt: null },
];

const MODEL_OPTIONS = [
  { id: "FACE_RECOGNITION", label: "Face Recognition", icon: "👤", color: "bg-ai-blue/10 text-ai-blue border-ai-blue/20" },
  { id: "BEHAVIOR", label: "Behavior Analysis", icon: "🧠", color: "bg-ai-purple/10 text-ai-purple border-ai-purple/20" },
  { id: "CLASSROOM_ACTIVITY", label: "Classroom Activity", icon: "🏫", color: "bg-success/10 text-success border-success/20" },
];

export default function AISyntheticPage() {
  const [jobs, setJobs] = useState<SyntheticJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [config, setConfig] = useState({
    name: "",
    modelType: "FACE_RECOGNITION",
    sampleCount: 10000,
    baseDataset: "ds-1",
  });
  const [augmentations, setAugmentations] = useState<AugmentationConfig[]>(DEFAULT_AUGMENTATIONS);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { setTimeout(() => { setJobs(MOCK_JOBS); setLoading(false); }, 300); }, []);

  const enabledAugs = augmentations.filter(a => a.enabled);
  const totalGenerated = jobs.filter(j => j.status === "COMPLETED").reduce((a, j) => a + j.sampleCount, 0);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const newJob: SyntheticJob = {
        id: `sj-${Date.now()}`,
        name: config.name || `Synthetic ${config.modelType.replace("_", " ")}`,
        modelType: config.modelType,
        sampleCount: config.sampleCount,
        augmentations: enabledAugs.map(a => a.id),
        status: "COMPLETED",
        progress: 100,
        createdAt: new Date(),
        completedAt: new Date(),
      };
      setJobs(prev => [newJob, ...prev]);
      setGenerating(false);
    }, 2000);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Synthetic Data Generation</h2>
          <p className="text-xs text-text-muted">Create augmented training data for robust AI model performance</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Generated Samples</p><p className="text-xl font-bold text-text-primary tabular-nums">{totalGenerated.toLocaleString()}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Generation Jobs</p><p className="text-xl font-bold text-ai-blue tabular-nums">{jobs.length}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Active Augmentations</p><p className="text-xl font-bold text-ai-purple tabular-nums">{enabledAugs.length}</p></GlassCard>
        <GlassCard subtle><p className="text-[10px] text-text-muted mb-0.5">Models Covered</p><p className="text-xl font-bold text-success tabular-nums">{new Set(jobs.map(j => j.modelType)).size}</p></GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 mb-6 glass rounded-xl border border-glass-border w-fit">
        {[{ id: "generate" as const, label: "Generate Data" }, { id: "history" as const, label: "Generation History" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={cn(
            "px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all",
            activeTab === t.id ? "bg-ai-blue text-white" : "text-text-dim hover:text-text-primary",
          )}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Generate */}
      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Config Panel */}
          <div className="lg:col-span-3 space-y-4">
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-4">⚙️ Generation Configuration</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1 block">Job Name</label>
                  <input
                    value={config.name}
                    onChange={e => setConfig(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-ai-blue/50"
                    placeholder="e.g., Nightlight Robustness Pack"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-text-muted mb-1 block">Sample Count</label>
                  <input
                    type="number"
                    value={config.sampleCount}
                    onChange={e => setConfig(p => ({ ...p, sampleCount: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary focus:outline-none focus:border-ai-blue/50"
                    min={100}
                    max={100000}
                    step={100}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-[10px] font-medium text-text-muted mb-2 block">Target Model Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {MODEL_OPTIONS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setConfig(p => ({ ...p, modelType: m.id }))}
                      className={cn(
                        "p-3 rounded-lg border text-center transition-all",
                        config.modelType === m.id
                          ? m.color + " ring-1 ring-current"
                          : "glass border-glass-border hover:border-ai-blue/20 text-text-dim",
                      )}
                    >
                      <span className="text-lg block mb-1">{m.icon}</span>
                      <span className="text-[9px] font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-text-muted mb-2 block">Base Dataset</label>
                <select
                  value={config.baseDataset}
                  onChange={e => setConfig(p => ({ ...p, baseDataset: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary focus:outline-none focus:border-ai-blue/50"
                >
                  <option value="ds-1">Student Face Dataset v2 (12,500 samples)</option>
                  <option value="ds-2">Classroom Behavior Dataset (45,000 samples)</option>
                  <option value="ds-3">Synthetic Augmentation Set (20,000 samples)</option>
                </select>
              </div>
            </GlassCard>

            {/* Augmentation Controls */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">🔄 Augmentation Pipeline</h3>
                <span className="text-[10px] text-text-muted">{enabledAugs.length} of {augmentations.length} enabled</span>
              </div>

              <div className="space-y-2">
                {augmentations.map(aug => (
                  <div key={aug.id} className={cn(
                    "p-3 rounded-lg border transition-all",
                    aug.enabled ? "bg-glass-medium border-ai-blue/20" : "glass border-glass-border opacity-50",
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={aug.enabled}
                          onChange={() => setAugmentations(prev => prev.map(a => a.id === aug.id ? { ...a, enabled: !a.enabled } : a))}
                          className="w-3.5 h-3.5 rounded border-glass-border accent-ai-blue"
                        />
                        <div>
                          <span className="text-[11px] font-medium text-text-primary">{aug.label}</span>
                          <p className="text-[9px] text-text-muted">{aug.description}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-text-muted font-mono">{aug.intensity}%</span>
                    </div>
                    {aug.enabled && (
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={aug.intensity}
                        onChange={e => setAugmentations(prev => prev.map(a => a.id === aug.id ? { ...a, intensity: parseInt(e.target.value) } : a))}
                        className="w-full h-1 rounded-full appearance-none bg-glass-light accent-ai-blue cursor-pointer"
                      />
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>

            <Button
              className="w-full"
              size="lg"
              disabled={generating || enabledAugs.length === 0 || config.sampleCount < 100}
              onClick={handleGenerate}
            >
              {generating ? (
                <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating {config.sampleCount.toLocaleString()} samples...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>{" "}Generate {config.sampleCount.toLocaleString()} Synthetic Samples</>
              )}
            </Button>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2 space-y-4">
            <GlassCard>
              <h3 className="text-sm font-semibold text-text-primary mb-3">🔮 Generation Preview</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg glass">
                  <p className="text-[9px] text-text-muted uppercase tracking-wider mb-2">Augmentation Workflow</p>
                  <div className="space-y-1.5">
                    {enabledAugs.length === 0 ? (
                      <p className="text-[10px] text-text-dim italic">Enable augmentations above</p>
                    ) : (
                      enabledAugs.map((aug, i) => (
                        <div key={aug.id} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-ai-blue shrink-0" />
                          <span className="text-[10px] text-text-primary">{aug.label}</span>
                          <span className="text-[8px] text-text-muted ml-auto">{aug.intensity}% intensity</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg glass text-center">
                    <p className="text-[9px] text-text-muted">Base Samples</p>
                    <p className="text-xs font-bold text-text-primary tabular-nums">{config.sampleCount.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg glass text-center">
                    <p className="text-[9px] text-text-muted">Augmented Output</p>
                    <p className="text-xs font-bold text-ai-blue tabular-nums">{(config.sampleCount * (1 + enabledAugs.length * 0.5)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>

                {enabledAugs.length > 0 && (
                  <div className="p-2 rounded-lg glass">
                    <p className="text-[9px] text-text-muted mb-1.5">Augmentation Ratio</p>
                    <div className="flex gap-0.5 h-4">
                      <div className="bg-ai-blue rounded-l-sm" style={{ width: `${100 / (1 + enabledAugs.length)}%` }} />
                      {enabledAugs.map((_, i) => (
                        <div key={i} className={cn(i % 2 === 0 ? "bg-ai-purple" : "bg-success")} style={{ width: `${100 / (1 + enabledAugs.length)}%` }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[8px] text-text-muted mt-0.5">
                      <span>Original</span>
                      <span>{enabledAugs.length} augmentations</span>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg glass bg-gradient-to-br from-ai-blue/5 to-ai-purple/5 border border-ai-blue/10">
                  <p className="text-[9px] font-medium text-ai-blue mb-1">💡 Tip</p>
                  <p className="text-[10px] text-text-secondary">
                    Use 3-5 augmentations per generation for balanced robustness. Too many may introduce artifacts that degrade model performance.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /><span className="text-sm text-text-muted">Loading generation history...</span></div></div>
          ) : jobs.length === 0 ? (
            <GlassCard className="text-center py-12"><p className="text-sm text-text-muted">No generation jobs yet</p></GlassCard>
          ) : (
            jobs.map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="hover:border-ai-blue/20 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold",
                        job.status === "COMPLETED" ? "bg-success/10 text-success" :
                        job.status === "GENERATING" ? "bg-ai-blue/10 text-ai-blue" : "bg-error/10 text-error",
                      )}>
                        {job.status === "COMPLETED" ? "✓" : job.status === "GENERATING" ? <div className="h-3 w-3 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" /> : "✗"}
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-text-primary">{job.name}</h3>
                        <span className="text-[9px] text-text-muted font-mono">{job.modelType.replace("_", " ")} • {job.sampleCount.toLocaleString()} samples</span>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                      job.status === "COMPLETED" ? "bg-success/10 text-success border-success/20" :
                      job.status === "GENERATING" ? "bg-ai-blue/10 text-ai-blue border-ai-blue/20" : "bg-error/10 text-error border-error/20",
                    )}>{job.status}</span>
                  </div>

                  {job.status === "GENERATING" && (
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-text-muted">Generating...</span>
                        <span className="text-text-primary font-medium">{job.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-glass-light overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${job.progress}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-ai-blue to-ai-purple"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {job.augmentations.map(aug => {
                      const augConfig = DEFAULT_AUGMENTATIONS.find(a => a.id === aug);
                      return (
                        <span key={aug} className="text-[8px] px-1.5 py-0.5 rounded-full bg-ai-blue/10 text-ai-blue border border-ai-blue/20">
                          {augConfig?.label || aug}
                        </span>
                      );
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            ))
          )}
        </div>
      )}
    </>
  );
}
