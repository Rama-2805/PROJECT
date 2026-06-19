"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { 
  Upload, 
  Play, 
  RefreshCw, 
  Sliders, 
  Search, 
  Target, 
  Cpu, 
  FileText,
  AlertCircle
} from "lucide-react";

interface RoadmapItem {
  quarter: string;
  year: string;
  title: string;
  description: string;
  capabilities: string[];
  status: "completed" | "in_progress" | "planned" | "research";
  impact: "high" | "medium" | "low";
}

interface CapabilityMaturity {
  area: string;
  icon: string;
  current: number;
  target: number;
  description: string;
}

const ROADMAP: RoadmapItem[] = [
  {
    quarter: "Q1-Q2", year: "2025",
    title: "AI Foundation & Core Capabilities",
    description: "Establish the fundamental AI infrastructure and core recognition capabilities",
    capabilities: [
      "Face recognition with ArcFace (99.1% accuracy)",
      "Behavior detection (YOLOv8) — phone, sleeping, distraction",
      "Pose classification for engagement analysis",
      "MLOps pipeline: training, evaluation, deployment",
      "Edge device management with OTA updates",
    ],
    status: "completed",
    impact: "high",
  },
  {
    quarter: "Q3", year: "2025",
    title: "Personalized Learning Analytics",
    description: "Move from group-level analytics to individual student learning insights",
    capabilities: [
      "Per-student learning pattern analysis",
      "Attention span tracking across sessions",
      "Personalized engagement recommendations",
      "Early warning system for at-risk students",
      "Integration with LMS platforms (Moodle, Canvas)",
    ],
    status: "in_progress",
    impact: "high",
  },
  {
    quarter: "Q4", year: "2025",
    title: "AI Teaching Assistants",
    description: "Deploy AI-powered assistants to support educators in real-time",
    capabilities: [
      "Real-time teaching quality feedback",
      "Automated question-answering during lectures",
      "Content difficulty adaptation suggestions",
      "Multi-modal classroom understanding (audio + video)",
      "Natural language interface for educators",
    ],
    status: "planned",
    impact: "high",
  },
  {
    quarter: "Q1", year: "2026",
    title: "Student Learning Predictions",
    description: "Predictive analytics for student outcomes and learning trajectories",
    capabilities: [
      "Academic performance prediction models",
      "Dropout risk identification (8+ weeks in advance)",
      "Course recommendation engine",
      "Learning path optimization",
      "Study group formation based on complementary skills",
    ],
    status: "planned",
    impact: "high",
  },
  {
    quarter: "Q2", year: "2026",
    title: "Digital Classroom Twins",
    description: "Full 3D digital twin integration with AI-driven simulations",
    capabilities: [
      "Real-time 3D classroom reconstruction",
      "What-if scenario simulations",
      "Seating arrangement optimization for engagement",
      "Resource utilization forecasting",
      "Emergency evacuation planning",
    ],
    status: "planned",
    impact: "medium",
  },
  {
    quarter: "Q3-Q4", year: "2026",
    title: "Self-Improving AI Platform",
    description: "Continuous autonomous improvement through feedback loops",
    capabilities: [
      "Automated model retraining from teacher feedback",
      "Cross-institution federated learning",
      "Zero-shot adaptation to new classroom layouts",
      "Automated augmentation strategy search",
      "Self-healing model degradation detection",
    ],
    status: "research",
    impact: "high",
  },
  {
    quarter: "2027+", year: "Future",
    title: "Generalized Educational AI",
    description: "Towards AGI-powered personalized education at scale",
    capabilities: [
      "Multi-modal understanding (vision, audio, text, behavior)",
      "Emotional intelligence and social dynamics analysis",
      "Personalized curriculum generation",
      "Automated assessment and feedback",
      "Cross-cultural and multi-language support",
    ],
    status: "research",
    impact: "high",
  },
];

const MATURITY_LEVELS: CapabilityMaturity[] = [
  { area: "Face Recognition", icon: "👤", current: 95, target: 99, description: "ArcFace-based recognition with 99.1% accuracy" },
  { area: "Behavior Detection", icon: "🧠", current: 85, target: 97, description: "YOLOv8 behavior analysis for 6 behavior classes" },
  { area: "Pose Classification", icon: "🏃", current: 70, target: 92, description: "MobileNetV3-based posture and engagement analysis" },
  { area: "Edge Computing", icon: "💻", current: 80, target: 95, description: "On-device inference with OTA model updates" },
  { area: "Personalized Analytics", icon: "📊", current: 40, target: 90, description: "Per-student learning pattern analysis" },
  { area: "Predictive Models", icon: "🔮", current: 25, target: 85, description: "Academic outcome and dropout prediction" },
  { area: "AI Teaching Assistants", icon: "🤖", current: 15, target: 80, description: "Real-time educator support systems" },
  { area: "Self-Improving AI", icon: "🔄", current: 10, target: 75, description: "Automated retraining from feedback loops" },
];

const STATUS_BADGES: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  in_progress: "bg-ai-blue/10 text-ai-blue border-ai-blue/20",
  planned: "bg-ai-purple/10 text-ai-purple border-ai-purple/20",
  research: "bg-warning/10 text-warning border-warning/20",
};

interface BoundingBox {
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function AIVisionPage() {
  const [activeTab, setActiveTab] = useState<"roadmap" | "playground">("roadmap");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Playground state
  const [task, setTask] = useState<"detect" | "phrase" | "ocr" | "gui">("detect");
  const [queryText, setQueryText] = useState<string>("person, laptop, backpack");
  const [selectedPreset, setSelectedPreset] = useState<string>("classroom");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("/classroom_feed.png");
  const [loading, setLoading] = useState(false);
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [rawOutput, setRawOutput] = useState<string>("");
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<"checking" | "online" | "offline">("checking");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check connection to local FastAPI AI service on port 8000
  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => {
        if (res.ok) setApiConnectionStatus("online");
        else setApiConnectionStatus("offline");
      })
      .catch(() => {
        setApiConnectionStatus("offline");
      });
  }, []);

  const handleTaskChange = (selectedTask: "detect" | "phrase" | "ocr" | "gui") => {
    setTask(selectedTask);
    if (selectedTask === "detect") setQueryText("person, laptop, backpack");
    else if (selectedTask === "phrase") setQueryText("the student raising their hand");
    else if (selectedTask === "gui") setQueryText("the settings tab");
    else setQueryText("");
  };

  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    setImageFile(null);
    if (preset === "classroom") {
      setImagePreviewUrl("/classroom_feed.png");
    } else if (preset === "rack") {
      setImagePreviewUrl("/device_rack.png");
    }
    setBoxes([]);
    setRawOutput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setSelectedPreset("upload");
      setImagePreviewUrl(URL.createObjectURL(file));
      setBoxes([]);
      setRawOutput("");
    }
  };

  const executeGrounding = async () => {
    setLoading(true);
    setBoxes([]);
    setRawOutput("");

    try {
      let fileToSend: File | Blob;
      if (imageFile) {
        fileToSend = imageFile;
      } else {
        // Load preset image as blob
        const imgRes = await fetch(imagePreviewUrl);
        fileToSend = await imgRes.blob();
      }

      const formData = new FormData();
      formData.append("image", fileToSend, "image.png");

      let endpoint = "http://localhost:8000/api/v1/grounding/detect";
      if (task === "phrase") {
        endpoint = "http://localhost:8000/api/v1/grounding/phrase";
        formData.append("query", queryText);
      } else if (task === "gui") {
        endpoint = "http://localhost:8000/api/v1/grounding/gui";
        formData.append("query", queryText);
        formData.append("output_type", "box");
      } else if (task === "ocr") {
        endpoint = "http://localhost:8000/api/v1/grounding/ocr";
      } else {
        formData.append("classes", queryText);
      }

      // Try calling the FastAPI backend directly
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Local FastAPI endpoint returned an error");
      }

      const data = await response.json();
      setRawOutput(data.answer);
      setFallbackMode(false);
      setApiConnectionStatus("online");

      // Parse boxes using regex matching
      const parsed = parseModelOutput(data.answer);
      setBoxes(parsed);
    } catch (err) {
      console.warn("FastAPI server offline. Running local browser simulation fallback.", err);
      // Run browser simulation
      setFallbackMode(true);
      setApiConnectionStatus("offline");
      simulateVlmGrounding();
    } finally {
      setLoading(false);
    }
  };

  const simulateVlmGrounding = () => {
    setTimeout(() => {
      let simulatedAnswer = "";
      if (task === "detect") {
        const classes = queryText.split(",").map(c => c.trim());
        const mockBoxes: string[] = [];
        classes.forEach((cls) => {
          // generate 1-2 boxes per class
          const count = Math.random() > 0.4 ? 2 : 1;
          for (let i = 0; i < count; i++) {
            const x1 = Math.floor(Math.random() * 600);
            const y1 = Math.floor(Math.random() * 600);
            const x2 = Math.min(1000, x1 + Math.floor(Math.random() * 200 + 100));
            const y2 = Math.min(1000, y1 + Math.floor(Math.random() * 200 + 100));
            mockBoxes.push(`<ref>${cls}</ref><box><${x1}><${y1}><${x2}><${y2}></box>`);
          }
        });
        simulatedAnswer = mockBoxes.join("");
      } else if (task === "phrase") {
        const x1 = 300, y1 = 200, x2 = 700, y2 = 800;
        simulatedAnswer = `<ref>${queryText}</ref><box><${x1}><${y1}><${x2}><${y2}></box>`;
      } else if (task === "gui") {
        const x1 = 450, y1 = 30, x2 = 550, y2 = 90;
        simulatedAnswer = `<ref>${queryText}</ref><box><${x1}><${y1}><${x2}><${y2}></box>`;
      } else {
        // OCR
        simulatedAnswer = `<ref>SmartCampus AI</ref><box><200><50><800><150></box><ref>Class Telemetry Active</ref><box><100><300><500><400></box>`;
      }

      setRawOutput(simulatedAnswer);
      setBoxes(parseModelOutput(simulatedAnswer));
    }, 1200);
  };

  const parseModelOutput = (answer: string): BoundingBox[] => {
    const parsed: BoundingBox[] = [];
    // Regular expression matching: <ref>label</ref><box><x1><y1><x2><y2></box>
    const boxRegex = /<ref>(.*?)<\/ref><box><(\d+)><(\d+)><(\d+)><(\d+)><\/box>/g;
    let match;

    while ((match = boxRegex.exec(answer)) !== null) {
      parsed.push({
        label: match[1],
        x1: parseInt(match[2]) / 10,
        y1: parseInt(match[3]) / 10,
        x2: parseInt(match[4]) / 10,
        y2: parseInt(match[5]) / 10,
      });
    }

    // Match point coordinates: <box><x><y></box>
    const pointRegex = /<box><(\d+)><(\d+)><\/box>/g;
    while ((match = pointRegex.exec(answer)) !== null) {
      const px = parseInt(match[1]) / 10;
      const py = parseInt(match[2]) / 10;
      parsed.push({
        label: "Point location",
        x1: px,
        y1: py,
        x2: px,
        y2: py,
      });
    }

    return parsed;
  };

  const filtered = activeFilter === "all" ? ROADMAP : ROADMAP.filter(r => r.status === activeFilter);

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">SmartCampus AI — Vision Intelligence</h2>
          <p className="text-xs text-text-muted">Open-vocabulary visual grounding, spatial object localization, and models roadmap</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 glass rounded-xl border border-glass-border w-fit">
          <button 
            onClick={() => setActiveTab("roadmap")} 
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap",
              activeTab === "roadmap" ? "bg-white text-black font-semibold" : "text-text-dim hover:text-text-primary"
            )}
          >
            📋 Roadmap & Maturity
          </button>
          <button 
            onClick={() => setActiveTab("playground")} 
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap",
              activeTab === "playground" ? "bg-white text-black font-semibold" : "text-text-dim hover:text-text-primary"
            )}
          >
            ⚡ LocateAnything Playground
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "roadmap" ? (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Hero Section */}
            <GlassCard className="mb-6 bg-gradient-to-br from-ai-blue/5 via-ai-purple/5 to-success/5 border-ai-blue/20">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-primary mb-2">🚀 The Vision</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    SmartCampus AI is evolving from an AI-powered classroom monitoring platform into a <span className="text-ai-blue font-semibold">self-improving educational intelligence ecosystem</span>.
                    By combining computer vision, natural language processing, predictive analytics, and continuous feedback loops,
                    we aim to create an AI platform that not only understands classroom dynamics but actively improves
                    educational outcomes for every student.
                  </p>
                </div>
                <div className="shrink-0 p-4 rounded-xl glass text-center">
                  <p className="text-3xl font-bold text-ai-blue">2025</p>
                  <p className="text-[10px] text-text-muted">Foundation Year</p>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-ai-blue to-ai-purple mx-auto my-2" />
                  <p className="text-2xl font-bold text-ai-purple">2027+</p>
                  <p className="text-[10px] text-text-muted">Self-Improving AI</p>
                </div>
              </div>
            </GlassCard>

            {/* Capability Maturity Model */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-primary mb-3">📈 Capability Maturity Model</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {MATURITY_LEVELS.map((m, i) => (
                  <motion.div key={m.area} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <GlassCard className="hover:border-ai-blue/20 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{m.icon}</span>
                        <span className="text-[11px] font-semibold text-text-primary">{m.area}</span>
                      </div>
                      <div className="mb-1">
                        <div className="flex justify-between text-[9px] mb-0.5">
                          <span className="text-text-muted">Current</span>
                          <span className="text-text-primary font-medium">{m.current}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-glass-light overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${m.current}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-ai-blue to-ai-purple"
                          />
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between text-[9px] mb-0.5">
                          <span className="text-text-muted">Target</span>
                          <span className="text-text-primary font-medium">{m.target}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-glass-light overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${m.target}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-ai-purple to-success opacity-40"
                          />
                        </div>
                      </div>
                      <p className="text-[8px] text-text-muted">{m.description}</p>
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="text-[8px] text-text-muted">Gap:</span>
                        <div className="flex-1 h-1 rounded-full bg-glass-light overflow-hidden">
                          <div className="h-full rounded-full bg-warning" style={{ width: `${Math.max(0, m.target - m.current)}%` }} />
                        </div>
                        <span className="text-[8px] font-medium text-warning">+{m.target - m.current}%</span>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-1 p-1 mb-6 glass rounded-xl border border-glass-border w-fit">
              {[
                { id: "all", label: "All Milestones" },
                { id: "completed", label: "✅ Completed" },
                { id: "in_progress", label: "🔄 In Progress" },
                { id: "planned", label: "📋 Planned" },
                { id: "research", label: "🔬 Research" },
              ].map(f => (
                <button key={f.id} onClick={() => setActiveFilter(f.id)} className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap",
                  activeFilter === f.id ? "bg-white text-black font-semibold" : "text-text-dim hover:text-text-primary",
                )}>{f.label}</button>
              ))}
            </div>

            {/* Roadmap Timeline */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-ai-blue via-ai-purple to-success opacity-30" />

              <div className="space-y-4">
                {filtered.map((item, i) => (
                  <motion.div
                    key={`${item.quarter}-${item.year}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="relative pl-14"
                  >
                    {/* Timeline Dot */}
                    <div className={cn(
                      "absolute left-4 top-5 h-4 w-4 rounded-full border-2 z-10",
                      item.status === "completed" ? "bg-success border-success" :
                      item.status === "in_progress" ? "bg-ai-blue border-ai-blue animate-pulse" :
                      item.status === "planned" ? "bg-ai-purple border-ai-purple" :
                      "bg-warning border-warning",
                    )} />

                    <GlassCard className={cn(
                      "transition-all hover:border-ai-blue/20",
                      item.impact === "high" ? "border-l-2 border-l-ai-blue/30" : "",
                    )}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                            <span className="text-[9px] font-mono text-text-muted">{item.quarter} {item.year}</span>
                          </div>
                          <p className="text-xs text-text-secondary">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                            item.impact === "high" ? "bg-ai-blue/10 text-ai-blue border-ai-blue/20" :
                            "bg-text-muted/10 text-text-muted border-glass-border",
                          )}>
                            {item.impact === "high" ? "🔴 High Impact" : item.impact === "medium" ? "🟡 Medium" : "🟢 Low"}
                          </span>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium", STATUS_BADGES[item.status])}>
                            {item.status === "completed" ? "✅ Done" :
                             item.status === "in_progress" ? "🔄 Active" :
                             item.status === "planned" ? "📋 Planned" : "🔬 Research"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {item.capabilities.map((cap, ci) => (
                          <div key={ci} className="flex items-center gap-1.5 p-1.5 rounded-lg glass">
                            <span className={cn(
                              "h-1 w-1 rounded-full shrink-0",
                              item.status === "completed" ? "bg-success" :
                              item.status === "in_progress" ? "bg-ai-blue" :
                              "bg-text-muted",
                            )} />
                            <span className={cn(
                              "text-[10px]",
                              item.status === "completed" ? "text-text-primary" : "text-text-secondary",
                            )}>{cap}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Future Capabilities Summary */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassCard className="bg-gradient-to-br from-ai-blue/5 to-transparent">
                <p className="text-2xl mb-1">🎯</p>
                <h4 className="text-xs font-semibold text-text-primary mb-1">Near-term (2025)</h4>
                <p className="text-[10px] text-text-secondary">Solidify core AI, launch personalized analytics, and begin teaching assistant deployment</p>
              </GlassCard>
              <GlassCard className="bg-gradient-to-br from-ai-purple/5 to-transparent">
                <p className="text-2xl mb-1">🚀</p>
                <h4 className="text-xs font-semibold text-text-primary mb-1">Mid-term (2026)</h4>
                <p className="text-[10px] text-text-secondary">Predictive models, digital twins, and autonomous self-improvement through feedback loops</p>
              </GlassCard>
              <GlassCard className="bg-gradient-to-br from-success/5 to-transparent">
                <p className="text-2xl mb-1">🌟</p>
                <h4 className="text-xs font-semibold text-text-primary mb-1">Long-term (2027+)</h4>
                <p className="text-[10px] text-text-secondary">Generalized educational AI with multi-modal understanding, emotional intelligence, and personalized curricula</p>
              </GlassCard>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="playground"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left/Middle: Image display and overlays */}
            <div className="lg:col-span-2 space-y-4">
              <GlassCard className="relative overflow-hidden" noPadding>
                {/* Visual canvas box */}
                <div className="relative aspect-video w-full bg-[#0d0d0d] flex items-center justify-center select-none overflow-hidden group">
                  
                  {/* Cyber Grid background */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

                  {/* Rendered Preview Image */}
                  <img 
                    src={imagePreviewUrl} 
                    alt="VLM Target" 
                    className="w-full h-full object-cover transition-transform duration-500" 
                  />

                  {/* Loading spinner overlay */}
                  {loading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
                      <div className="relative flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full border-4 border-ai-blue border-t-transparent animate-spin" />
                        <Cpu className="absolute h-5 w-5 text-ai-blue animate-pulse" />
                      </div>
                      <p className="text-xs text-ai-blue font-mono uppercase tracking-wider animate-pulse">LocateAnything VLM decoding...</p>
                    </div>
                  )}

                  {/* SVG or CSS overlay boxes */}
                  {!loading && boxes.map((box, index) => {
                    const isPoint = box.x1 === box.x2 && box.y1 === box.y2;
                    
                    if (isPoint) {
                      return (
                        <div
                          key={index}
                          style={{
                            left: `${box.x1}%`,
                            top: `${box.y1}%`,
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                        >
                          {/* Pulsing point element */}
                          <div className="h-6 w-6 rounded-full border-2 border-ai-blue bg-ai-blue/30 flex items-center justify-center shadow-[0_0_20px_#3B82F6]">
                            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                          </div>
                          <span className="absolute left-7 -translate-y-1/2 px-1.5 py-0.5 rounded bg-black/90 border border-ai-blue/30 text-ai-blue font-mono font-bold text-[8px] whitespace-nowrap uppercase tracking-wider">
                            {box.label}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={index}
                        style={{
                          left: `${box.x1}%`,
                          top: `${box.y1}%`,
                          width: `${box.x2 - box.x1}%`,
                          height: `${box.y2 - box.y1}%`,
                        }}
                        className="absolute border-2 border-ai-blue bg-ai-blue/10 rounded shadow-[0_0_15px_rgba(59,130,246,0.25)] transition-all hover:bg-ai-blue/25 hover:border-white z-20 group"
                      >
                        {/* Neon top label tag */}
                        <div className="absolute -top-5 left-[-2px] px-2 py-0.5 rounded-t bg-ai-blue text-black font-semibold font-mono text-[8px] whitespace-nowrap uppercase tracking-wider leading-none">
                          {box.label}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Mode tag indicator */}
                  <div className="absolute top-3 left-3 z-30 flex gap-2">
                    <span className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider font-mono border backdrop-blur-md",
                      apiConnectionStatus === "online" && !fallbackMode
                        ? "bg-success/20 text-success border-success/30" 
                        : "bg-warning/20 text-warning border-warning/30"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full animate-glow-pulse", apiConnectionStatus === "online" ? "bg-success" : "bg-warning")} />
                      {apiConnectionStatus === "online" && !fallbackMode ? "VLM Microservice Connected" : "Running Simulation Mode"}
                    </span>
                  </div>
                </div>
              </GlassCard>

              {/* Bounding box list */}
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">Telemetry Detections ({boxes.length})</h4>
                  {boxes.length > 0 && (
                    <button onClick={() => setBoxes([])} className="text-[10px] text-text-muted hover:text-white transition-colors">
                      Clear annotations
                    </button>
                  )}
                </div>
                {boxes.length === 0 ? (
                  <div className="h-16 flex items-center justify-center border border-white/5 border-dashed rounded-lg bg-white/[0.01]">
                    <p className="text-[10px] text-text-muted font-mono">No annotations generated. Configure target and execute model pass.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {boxes.map((box, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ai-blue/20 bg-ai-blue/5 text-ai-blue font-mono text-[9px] uppercase tracking-wide">
                        <Target className="h-3 w-3 shrink-0" />
                        <span className="font-semibold text-white">{box.label}</span>
                        <span className="text-text-muted text-[8px] ml-1">
                          [{box.x1.toFixed(0)}, {box.y1.toFixed(0)}, {box.x2.toFixed(0)}, {box.y2.toFixed(0)}]
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Right Side: Configuration & Outputs */}
            <div className="space-y-4">
              
              {/* Task Settings */}
              <GlassCard>
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                  <Sliders className="h-4 w-4 text-ai-blue" />
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">Model Configuration</h3>
                </div>

                {/* Task selector buttons */}
                <div className="space-y-1.5 mb-4">
                  <label className="text-[10px] text-text-muted font-mono uppercase">VLM Telemetry Mode</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "detect", label: "Detection", desc: "Multi-object detection" },
                      { id: "phrase", label: "Phrasing", desc: "Ground natural language" },
                      { id: "ocr", label: "Text OCR", desc: "Localize signs & text" },
                      { id: "gui", label: "GUI Click", desc: "Point screen components" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleTaskChange(t.id as any)}
                        className={cn(
                          "p-2.5 rounded-lg border text-left transition-all",
                          task === t.id 
                            ? "bg-white border-white text-black font-semibold shadow-lg"
                            : "bg-white/[0.02] border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.05]"
                        )}
                      >
                        <p className="text-[10px] font-bold tracking-tight">{t.label}</p>
                        <p className={cn("text-[7.5px] leading-tight mt-0.5", task === t.id ? "text-black/70" : "text-text-muted")}>{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Query parameters */}
                {task !== "ocr" && (
                  <div className="space-y-2 mb-4">
                    <label className="text-[10px] text-text-muted font-mono uppercase">
                      {task === "detect" ? "Target Classes (Comma-separated)" : "Grounding Query Phrase"}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder={task === "detect" ? "person, laptop, chair" : "e.g., student holding a blue water bottle"}
                        className="w-full bg-[#111111] border border-white/10 rounded-lg py-2 pl-3 pr-8 text-xs font-mono text-white focus:outline-none focus:border-ai-blue transition-colors"
                      />
                      <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                    </div>
                  </div>
                )}

                {/* Preset selectors */}
                <div className="space-y-2 mb-6">
                  <label className="text-[10px] text-text-muted font-mono uppercase">Telemetry Image Source</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handlePresetSelect("classroom")}
                      className={cn(
                        "p-2 rounded-lg border text-center text-[9px] font-semibold tracking-tight transition-all",
                        selectedPreset === "classroom" ? "bg-ai-blue border-ai-blue text-black" : "bg-white/[0.02] border-white/5 text-gray-400"
                      )}
                    >
                      Classroom
                    </button>
                    <button
                      onClick={() => handlePresetSelect("rack")}
                      className={cn(
                        "p-2 rounded-lg border text-center text-[9px] font-semibold tracking-tight transition-all",
                        selectedPreset === "rack" ? "bg-ai-blue border-ai-blue text-black" : "bg-white/[0.02] border-white/5 text-gray-400"
                      )}
                    >
                      Device Rack
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "p-2 rounded-lg border text-center text-[9px] font-semibold tracking-tight transition-all flex items-center justify-center gap-1",
                        selectedPreset === "upload" ? "bg-ai-blue border-ai-blue text-black" : "bg-white/[0.02] border-white/5 text-gray-400"
                      )}
                    >
                      <Upload className="h-3 w-3" />
                      {imageFile ? "Custom" : "Upload"}
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Run button */}
                <Button
                  onClick={executeGrounding}
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-ai-blue to-ai-purple text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
                >
                  {loading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-black" />
                  )}
                  Execute VLM Grounding
                </Button>
              </GlassCard>

              {/* Raw JSON or Model coordinates output */}
              <GlassCard>
                <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                  <FileText className="h-4 w-4 text-ai-purple" />
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">Raw Decoded Tokens</h3>
                </div>

                <div className="bg-black/80 rounded-lg p-3 font-mono text-[9px] text-green-400 border border-white/5 overflow-x-auto min-h-20 max-h-40 whitespace-pre-wrap select-all">
                  {rawOutput ? (
                    rawOutput
                  ) : (
                    <span className="text-text-muted">Awaiting inference token stream...</span>
                  )}
                </div>
                
                {fallbackMode && (
                  <div className="mt-2.5 flex items-start gap-1.5 p-2 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    <p className="text-[8.5px] text-warning/80 leading-normal">
                      <strong>Simulation Active:</strong> The local FastAPI server on port 8000 is not running. Using browser emulation to test coordinates in 4GB RAM environment.
                    </p>
                  </div>
                )}
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
