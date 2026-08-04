"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Upload, Users, CheckCircle2, XCircle,
  Play, Eye, UserPlus, GitMerge, Trash2, Star,
  ScanFace, Loader2, Search, ChevronRight,
  Plus, BarChart3, Zap, Shield,
  X, Image as ImageIcon, RotateCcw, AlertTriangle,
  Clock, Cpu, Database, TrendingUp, Camera, FileVideo
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════ */
type SessionStatus = "PENDING" | "PROCESSING" | "REVIEW_REQUIRED" | "COMPLETED" | "FAILED";
type ClusterStatus = "UNASSIGNED" | "ASSIGNED" | "REJECTED";

interface Session {
  id: string; name: string; department: string; program: string;
  semester: string; section: string; subject: string; teacher: string;
  lectureDate: string; lectureTime: string; status: SessionStatus;
  totalVideos: number; progressPercentage: number;
  processedFrames: number; detectedFacesCount: number;
  generatedClusters: number; createdAt: string;
}

interface ClusterImage {
  id: string; frameNumber: number; videoFileName: string;
  timestampSec: number; qualityScore: number; isBest: boolean;
}

interface Cluster {
  id: string; sessionId: string; clusterNumber: number;
  sampleCount: number; qualityAvg: number; confidence: number;
  firstSeenTime: string; lastSeenTime: string;
  status: ClusterStatus; images: ClusterImage[];
  assignedStudentName?: string;
}

/* ═══════════════════════════════════════════════════════════════════
   MOCK DATA
═══════════════════════════════════════════════════════════════════ */
const MOCK_SESSIONS: Session[] = [
  {
    id: "sess-001",
    name: "CSE 6th Sem — Computer Vision",
    department: "CSE", program: "B.Tech", semester: "6th Semester",
    section: "Section A", subject: "Computer Vision",
    teacher: "Dr. Ramesh Kumar",
    lectureDate: "2026-07-29", lectureTime: "09:00",
    status: "REVIEW_REQUIRED",
    totalVideos: 5, progressPercentage: 100,
    processedFrames: 24684, detectedFacesCount: 24684,
    generatedClusters: 2, createdAt: "2026-07-29T09:00:00Z",
  },
  {
    id: "sess-002",
    name: "ISE 4th Sem — Data Structures",
    department: "ISE", program: "B.Tech", semester: "4th Semester",
    section: "Section B", subject: "Data Structures",
    teacher: "Prof. Anita Sharma",
    lectureDate: "2026-07-28", lectureTime: "11:00",
    status: "PENDING",
    totalVideos: 3, progressPercentage: 0,
    processedFrames: 0, detectedFacesCount: 0,
    generatedClusters: 0, createdAt: "2026-07-28T11:00:00Z",
  },
];

const MOCK_CLUSTERS: Cluster[] = [
  {
    id: "clust-001", sessionId: "sess-001", clusterNumber: 1,
    sampleCount: 4234, qualityAvg: 0.92, confidence: 0.97,
    firstSeenTime: "00:00:12", lastSeenTime: "01:28:45",
    status: "UNASSIGNED",
    images: Array.from({ length: 12 }, (_, i) => ({
      id: `img-001-${i}`, frameNumber: (i + 1) * 124,
      videoFileName: `lecture_vid${Math.floor(i / 3) + 1}.mp4`,
      timestampSec: (i + 1) * 124 * 50,
      qualityScore: 0.85 + Math.random() * 0.14, isBest: i === 3,
    })),
  },
  {
    id: "clust-002", sessionId: "sess-001", clusterNumber: 2,
    sampleCount: 3891, qualityAvg: 0.88, confidence: 0.95,
    firstSeenTime: "00:00:08", lastSeenTime: "01:29:02",
    status: "UNASSIGNED",
    images: Array.from({ length: 9 }, (_, i) => ({
      id: `img-002-${i}`, frameNumber: (i + 1) * 156,
      videoFileName: `lecture_vid${Math.floor(i / 2) + 1}.mp4`,
      timestampSec: (i + 1) * 156 * 50,
      qualityScore: 0.82 + Math.random() * 0.16, isBest: i === 1,
    })),
  },
];

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING:          { label: "Pending",         dot: "bg-slate-400",              badge: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  PROCESSING:       { label: "Processing",      dot: "bg-blue-400 animate-pulse", badge: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  REVIEW_REQUIRED:  { label: "Review Required", dot: "bg-amber-400 animate-pulse",badge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  COMPLETED:        { label: "Completed",       dot: "bg-emerald-400",            badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  FAILED:           { label: "Failed",          dot: "bg-red-400",                badge: "text-red-400 bg-red-500/10 border-red-500/30" },
  UNASSIGNED:       { label: "Unassigned",      dot: "bg-slate-400",              badge: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  ASSIGNED:         { label: "Assigned",        dot: "bg-emerald-400",            badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  REJECTED:         { label: "Rejected",        dot: "bg-red-400",                badge: "text-red-400 bg-red-500/10 border-red-500/30" },
};

/* ═══════════════════════════════════════════════════════════════════
   FACE AVATAR — biometric-style AI face placeholder
═══════════════════════════════════════════════════════════════════ */
const AVATAR_PALETTES = [
  { from: "#3B82F6", to: "#8B5CF6" }, // blue-violet
  { from: "#06B6D4", to: "#3B82F6" }, // cyan-blue
  { from: "#10B981", to: "#06B6D4" }, // emerald-cyan
  { from: "#F59E0B", to: "#EF4444" }, // amber-red
  { from: "#8B5CF6", to: "#EC4899" }, // violet-pink
  { from: "#EF4444", to: "#F59E0B" }, // red-amber
];

function FaceAvatar({ id, size = 56 }: { id: string; size?: number }) {
  const idx = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTES.length;
  const p = AVATAR_PALETTES[idx];
  const half = size / 2;
  const r = size * 0.35;
  const svgId = `grad-${id.replace(/\W/g, "")}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <defs>
        <radialGradient id={svgId} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={p.from} stopOpacity="0.25" />
          <stop offset="100%" stopColor={p.to} stopOpacity="0.08" />
        </radialGradient>
        <linearGradient id={`lg-${svgId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.from} />
          <stop offset="100%" stopColor={p.to} />
        </linearGradient>
        <clipPath id={`clip-${svgId}`}>
          <circle cx={half} cy={half} r={half} />
        </clipPath>
      </defs>
      {/* BG */}
      <circle cx={half} cy={half} r={half} fill={`url(#${svgId})`} />
      <circle cx={half} cy={half} r={half - 0.5} fill="none" stroke={p.from} strokeOpacity="0.35" strokeWidth="1" />
      {/* Face silhouette */}
      <g clipPath={`url(#clip-${svgId})`}>
        {/* Head */}
        <ellipse cx={half} cy={half * 0.9} rx={size * 0.22} ry={size * 0.26}
          fill={`url(#lg-${svgId})`} fillOpacity="0.7" />
        {/* Shoulders */}
        <ellipse cx={half} cy={size * 1.1} rx={size * 0.38} ry={size * 0.22}
          fill={`url(#lg-${svgId})`} fillOpacity="0.4" />
        {/* Scan lines */}
        {[0.35, 0.52, 0.68].map((y, i) => (
          <line key={i} x1={half - r * 0.6} y1={size * y} x2={half + r * 0.6} y2={size * y}
            stroke={p.from} strokeOpacity="0.2" strokeWidth="0.5" />
        ))}
        {/* Corner brackets */}
        {[
          [half - r, size * 0.25, 1, 1],
          [half + r, size * 0.25, -1, 1],
          [half - r, size * 0.75, 1, -1],
          [half + r, size * 0.75, -1, -1],
        ].map(([x, y, dx, dy], i) => (
          <g key={i}>
            <line x1={+x} y1={+y} x2={+x + +dx * size * 0.07} y2={+y}
              stroke={p.from} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1={+x} y1={+y} x2={+x} y2={+y + +dy * size * 0.07}
              stroke={p.from} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        ))}
      </g>
      {/* Ring */}
      <circle cx={half} cy={half} r={half - 1} fill="none"
        stroke={`url(#lg-${svgId})`} strokeWidth="1.5" strokeOpacity="0.5"
        strokeDasharray={`${half} ${half}`} strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STAT CHIP
═══════════════════════════════════════════════════════════════════ */
function StatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
      <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} />
      <div>
        <p className="text-xs font-bold text-text-primary leading-none">{value}</p>
        <p className="text-[9px] text-text-muted uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QUALITY RING
═══════════════════════════════════════════════════════════════════ */
function QualityRing({ score, size = 48 }: { score: number; size?: number }) {
  const pct = Math.round(score * 100);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 90 ? "#10B981" : pct >= 75 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CREATE SESSION MODAL
═══════════════════════════════════════════════════════════════════ */
function CreateSessionModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Session) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name: "", department: "CSE", program: "B.Tech", semester: "6",
    section: "A", subject: "", teacher: "", lectureDate: new Date().toISOString().split("T")[0], lectureTime: "09:00",
  });
  const [videos, setVideos] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value })),
  });

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-blue-500/60 focus:bg-blue-500/5 placeholder:text-text-muted transition-all";
  const labelCls = "block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5";

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreated({
      id: `sess-${Date.now()}`,
      name: form.name || `${form.department} ${form.semester}th Sem — ${form.subject || "Lecture"}`,
      department: form.department, program: form.program,
      semester: `${form.semester}th Semester`, section: `Section ${form.section}`,
      subject: form.subject, teacher: form.teacher,
      lectureDate: form.lectureDate, lectureTime: form.lectureTime,
      status: "PENDING", totalVideos: videos.length,
      progressPercentage: 0, processedFrames: 0,
      detectedFacesCount: 0, generatedClusters: 0,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-xl bg-[#08091A] border border-white/[0.12] rounded-2xl shadow-[0_0_80px_rgba(59,130,246,0.15)] overflow-hidden"
      >
        {/* Glow strip */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <FileVideo className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">New Enrollment Session</h2>
              <p className="text-[11px] text-text-muted">Step {step} of 2 — {step === 1 ? "Academic Context" : "Upload Videos"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 gap-2 mb-5">
          {[1, 2].map(s => (
            <div key={s} className={cn("h-0.5 flex-1 rounded-full transition-all duration-500",
              step >= s ? "bg-blue-500" : "bg-white/10")} />
          ))}
        </div>

        <form onSubmit={handleCreate} className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                <div>
                  <label className={labelCls}>Session Name</label>
                  <input placeholder="e.g. CSE 6th Sem — Computer Vision" className={inputCls} {...field("name")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Department</label>
                    <select className={inputCls} {...field("department")}>
                      {["CSE","ISE","ECE","EEE","AIML","MECH","CIVIL"].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Program</label>
                    <select className={inputCls} {...field("program")}>
                      {["B.Tech","M.Tech","BCA","MCA","MBA"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Semester</label>
                    <select className={inputCls} {...field("semester")}>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Section</label>
                    <select className={inputCls} {...field("section")}>
                      {["A","B","C","D"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Subject</label>
                    <input placeholder="Computer Vision" className={inputCls} {...field("subject")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Lecture Date</label>
                    <input type="date" className={inputCls} {...field("lectureDate")} />
                  </div>
                  <div>
                    <label className={labelCls}>Lecture Time</label>
                    <input type="time" className={inputCls} {...field("lectureTime")} />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button type="button" onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    Next — Upload Videos <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                <input ref={fileRef} type="file" accept=".mp4,.mov,.avi,.mkv" multiple className="hidden"
                  onChange={e => setVideos(Array.from(e.target.files || []))} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/10 hover:border-blue-500/40 bg-white/[0.02] hover:bg-blue-500/5 rounded-xl p-8 text-center transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-500/20 transition-all">
                    <Upload className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-sm font-semibold text-text-primary mb-1">
                    {videos.length > 0 ? `${videos.length} video${videos.length > 1 ? "s" : ""} selected` : "Drop classroom videos here"}
                  </p>
                  <p className="text-[11px] text-text-muted">MP4, MOV, AVI, MKV · Multiple files supported</p>
                </button>

                {videos.length > 0 && (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {videos.map((v, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                        <Video className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="flex-1 text-xs text-text-primary truncate">{v.name}</span>
                        <span className="text-[10px] font-mono text-text-muted shrink-0">{(v.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 flex gap-2.5">
                  <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    The AI pipeline processes frames at 1 FPS, runs YOLO face detection, ArcFace embedding, and HDBSCAN clustering automatically.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setStep(1)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary text-sm font-medium rounded-xl transition-all">
                    ← Back
                  </button>
                  <button type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <Plus className="w-4 h-4" /> Create Session
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ASSIGN STUDENT MODAL
═══════════════════════════════════════════════════════════════════ */
const MOCK_EXISTING = [
  { id: "s1", usn: "1VE23CS001", name: "Arjun Sharma", dept: "CSE", sem: 6 },
  { id: "s2", usn: "1VE23CS002", name: "Priya Nair",   dept: "CSE", sem: 6 },
  { id: "s3", usn: "1VE23IS001", name: "Riya Verma",   dept: "ISE", sem: 4 },
];

function AssignModal({ cluster, onClose, onDone }: { cluster: Cluster; onClose: () => void; onDone: (cId: string, name: string) => void }) {
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [form, setForm] = useState({ name: "", usn: "", dept: "CSE", sem: "6", section: "A", email: "", phone: "" });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = MOCK_EXISTING.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.usn.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-muted transition-all";
  const labelCls = "block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5";

  const handleNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    onDone(cluster.id, form.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-lg bg-[#08091A] border border-white/[0.12] rounded-2xl shadow-[0_0_80px_rgba(16,185,129,0.12)] overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <FaceAvatar id={cluster.id} size={40} />
            <div>
              <h2 className="text-sm font-bold text-text-primary">Assign Student</h2>
              <p className="text-[11px] text-text-muted">Cluster #{cluster.clusterNumber} · {cluster.sampleCount.toLocaleString()} detections · {Math.round(cluster.confidence * 100)}% confidence</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-2 mb-5">
          {([["new","Create New Student"],["existing","Link Existing"]] as const).map(([t, l]) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn("flex-1 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border",
                tab === t ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-white/[0.03] border-white/[0.08] text-text-muted hover:bg-white/[0.06]")}>
              {l}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {tab === "new" && (
              <motion.form key="new" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                onSubmit={handleNew} className="space-y-3">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Student Full Name" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>USN *</label>
                    <input required value={form.usn} onChange={e => setForm(p => ({ ...p, usn: e.target.value }))}
                      placeholder="1VE23CS001" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Department</label>
                    <select value={form.dept} onChange={e => setForm(p => ({ ...p, dept: e.target.value }))} className={inputCls}>
                      {["CSE","ISE","ECE","EEE","AIML","MECH","CIVIL"].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="student@college.edu.in" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 9999999999" className={inputCls} />
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all mt-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" />Enroll & Generate Embedding</>}
                </button>
              </motion.form>
            )}

            {tab === "existing" && (
              <motion.div key="existing" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or USN…" className={cn(inputCls, "pl-10")} />
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {filtered.map(s => (
                    <button key={s.id} type="button" onClick={() => onDone(cluster.id, s.name)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-emerald-500/8 hover:border-emerald-500/30 text-left transition-all group">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {s.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary">{s.name}</p>
                        <p className="text-[11px] text-text-muted">{s.usn} · {s.dept} · Sem {s.sem}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-emerald-400 transition-colors shrink-0" />
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="text-center py-8 text-text-muted text-sm">No students found</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   GALLERY MODAL
═══════════════════════════════════════════════════════════════════ */
function GalleryModal({ cluster, onClose }: { cluster: Cluster; onClose: () => void }) {
  const [active, setActive] = useState(0);
  const img = cluster.images[active];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-5xl h-[82vh] bg-[#08091A] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <FaceAvatar id={cluster.id} size={38} />
            <div>
              <h2 className="text-sm font-bold text-text-primary">Cluster #{cluster.clusterNumber} — Biometric Gallery</h2>
              <p className="text-[11px] text-text-muted">{cluster.images.length} captured frames · {cluster.sampleCount.toLocaleString()} total detections · {Math.round(cluster.confidence * 100)}% identity confidence</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Viewer */}
          <div className="flex-1 flex flex-col items-center justify-center bg-black/40 relative p-8">
            {/* Face display */}
            <div className="relative">
              <div className="w-52 h-52 rounded-2xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/[0.12] flex items-center justify-center relative overflow-hidden shadow-2xl">
                <FaceAvatar id={`${cluster.id}-${active}`} size={160} />
                {/* Scan animation */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent animate-[slideDown_2s_ease-in-out_infinite]" />
                {img?.isBest && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-2 py-1">
                    <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                    <span className="text-[9px] text-yellow-400 font-bold">BEST FRAME</span>
                  </div>
                )}
              </div>
              {/* Quality indicator */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#0D0F24] border border-white/[0.12] rounded-full px-3 py-1 flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", (img?.qualityScore || 0) >= 0.9 ? "bg-emerald-400" : "bg-yellow-400")} />
                <span className="text-[10px] font-mono text-text-primary">{Math.round((img?.qualityScore || 0) * 100)}% quality</span>
              </div>
            </div>

            {/* Meta */}
            <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-sm">
              {[
                { label: "Frame #", value: `${img?.frameNumber}` },
                { label: "Source", value: img?.videoFileName.replace("lecture_vid","Vid ").replace(".mp4","") },
                { label: "Timestamp", value: `${Math.floor((img?.timestampSec || 0) / 60)}m ${(img?.timestampSec || 0) % 60}s` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                  <p className="text-[11px] font-semibold text-text-primary">{value}</p>
                  <p className="text-[9px] text-text-muted mt-0.5 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium transition-all">
                <Star className="w-3.5 h-3.5" />Set as Best
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-text-muted hover:text-text-primary rounded-lg text-xs font-medium transition-all">
                <RotateCcw className="w-3.5 h-3.5" />Recrop
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-all">
                <Trash2 className="w-3.5 h-3.5" />Remove
              </button>
            </div>
          </div>

          {/* Filmstrip */}
          <div className="w-56 border-l border-white/[0.08] flex flex-col bg-black/20 shrink-0">
            <div className="px-4 py-3 border-b border-white/[0.08] shrink-0">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Captured Frames</p>
              <p className="text-[9px] text-text-muted mt-0.5">{cluster.images.length} images</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cluster.images.map((img, i) => (
                <button key={img.id} onClick={() => setActive(i)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left",
                    active === i ? "bg-purple-500/15 border-purple-500/40" : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.05]"
                  )}>
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                    active === i ? "bg-purple-500/20 border-purple-500/30" : "bg-white/[0.04] border-white/[0.08]")}>
                    <ScanFace className={cn("w-4 h-4", active === i ? "text-purple-400" : "text-text-muted")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-text-primary">Frame #{img.frameNumber}</p>
                    <p className="text-[9px] text-text-muted truncate">{img.videoFileName}</p>
                  </div>
                  {img.isBest && <Star className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" />}
                </button>
              ))}
            </div>

            {/* Cluster stats */}
            <div className="p-4 border-t border-white/[0.08] space-y-2.5 shrink-0">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">Identity Timeline</p>
              <div className="space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between"><span className="text-text-muted">First Seen</span><span className="text-text-primary">{cluster.firstSeenTime}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Last Seen</span><span className="text-text-primary">{cluster.lastSeenTime}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Detections</span><span className="text-blue-400">{cluster.sampleCount.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CLUSTER CARD
═══════════════════════════════════════════════════════════════════ */
function ClusterCard({ c, onAssign, onReject, onGallery }: {
  c: Cluster;
  onAssign: (c: Cluster) => void;
  onReject: (id: string) => void;
  onGallery: (c: Cluster) => void;
}) {
  const sm = STATUS_META[c.status];
  const q = c.qualityAvg;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all duration-200 group",
        c.status === "ASSIGNED" ? "border-emerald-500/25 bg-emerald-500/5" :
        c.status === "REJECTED" ? "border-red-500/20 bg-red-500/5 opacity-60" :
        "border-white/[0.09] bg-white/[0.025] hover:border-blue-500/30 hover:bg-blue-500/5"
      )}
    >
      {/* Top glow line on hover */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/40 transition-all duration-500" />

      {/* Face Panel */}
      <div className="flex flex-col items-center gap-3 pt-5 pb-4 px-4 relative">
        {/* Status badge */}
        <div className={cn("absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider", sm.badge)}>
          <div className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />
          {sm.label}
        </div>

        {/* Avatar + quality ring */}
        <div className="relative">
          <FaceAvatar id={c.id} size={72} />
          <div className="absolute -bottom-1 -right-1">
            <QualityRing score={q} size={32} />
          </div>
        </div>

        <div className="text-center">
          {c.assignedStudentName ? (
            <>
              <p className="text-sm font-bold text-emerald-400">{c.assignedStudentName}</p>
              <p className="text-[10px] text-text-muted">Cluster #{c.clusterNumber}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-text-primary">Cluster #{c.clusterNumber}</p>
              <p className="text-[10px] text-text-muted">Unidentified Student</p>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-y border-white/[0.06] text-center">
        {[
          { label: "Faces", value: c.sampleCount >= 1000 ? `${(c.sampleCount / 1000).toFixed(1)}k` : c.sampleCount, color: "text-blue-400" },
          { label: "Quality", value: `${Math.round(q * 100)}%`, color: q >= 0.9 ? "text-emerald-400" : q >= 0.75 ? "text-yellow-400" : "text-red-400" },
          { label: "Conf.", value: `${Math.round(c.confidence * 100)}%`, color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-2.5">
            <p className={cn("text-xs font-bold", color)}>{value}</p>
            <p className="text-[9px] text-text-muted uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 flex items-center justify-between text-[10px] font-mono text-text-muted border-b border-white/[0.05]">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.firstSeenTime}</span>
        <div className="flex-1 mx-2 border-t border-dashed border-white/20" />
        <span>{c.lastSeenTime}</span>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        {c.status === "UNASSIGNED" && (
          <>
            <button onClick={() => onAssign(c)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_16px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.35)]">
              <UserPlus className="w-3.5 h-3.5" />Assign Student
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onGallery(c)}
                className="flex items-center justify-center gap-1.5 py-2 bg-white/[0.04] hover:bg-purple-500/10 border border-white/[0.08] hover:border-purple-500/30 text-text-muted hover:text-purple-400 rounded-xl text-[11px] font-medium transition-all">
                <Eye className="w-3.5 h-3.5" />Gallery
              </button>
              <button onClick={() => onReject(c.id)}
                className="flex items-center justify-center gap-1.5 py-2 bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 text-text-muted hover:text-red-400 rounded-xl text-[11px] font-medium transition-all">
                <XCircle className="w-3.5 h-3.5" />Reject
              </button>
            </div>
          </>
        )}
        {c.status === "ASSIGNED" && (
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />Student Enrolled
          </div>
        )}
        {c.status === "REJECTED" && (
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
            <XCircle className="w-3.5 h-3.5" />Cluster Rejected
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SESSION LIST ITEM
═══════════════════════════════════════════════════════════════════ */
function SessionItem({ s, active, onClick }: { s: Session; active: boolean; onClick: () => void }) {
  const sm = STATUS_META[s.status];
  return (
    <button onClick={onClick}
      className={cn(
        "w-full text-left p-3.5 rounded-xl border transition-all duration-200 group relative overflow-hidden",
        active ? "bg-blue-500/10 border-blue-500/35 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
               : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.14]"
      )}>
      {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r" />}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", sm.dot)} />
          <p className="text-xs font-semibold text-text-primary truncate leading-tight">{s.name}</p>
        </div>
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0", sm.badge)}>{sm.label}</span>
      </div>
      <div className="pl-4 space-y-1">
        <p className="text-[10px] text-text-muted">{s.department} · {s.semester} · {s.section}</p>
        <p className="text-[10px] text-text-muted">{s.lectureDate}</p>
      </div>
      {s.progressPercentage > 0 && (
        <div className="pl-4 mt-2.5">
          <div className="flex justify-between text-[9px] text-text-muted mb-1">
            <span>{s.generatedClusters} identities</span>
            <span>{Math.round(s.progressPercentage)}%</span>
          </div>
          <div className="h-0.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${s.progressPercentage}%` }} />
          </div>
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════════════ */
function EmptyState({ status, onStart }: { status: SessionStatus; onStart: () => void }) {
  if (status === "PROCESSING") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Cpu className="w-8 h-8 text-blue-400" />
          </div>
          <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-2">AI Pipeline Running</h3>
        <p className="text-sm text-text-muted max-w-xs leading-relaxed">
          YOLO detection · RetinaFace alignment · ArcFace embedding · HDBSCAN clustering
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-20 h-20 rounded-2xl bg-blue-500/8 border border-blue-500/15 flex items-center justify-center mb-5">
        <Play className="w-9 h-9 text-blue-400" />
      </div>
      <h3 className="text-base font-bold text-text-primary mb-2">Ready to Process</h3>
      <p className="text-sm text-text-muted max-w-[280px] mb-6 leading-relaxed">
        Click <strong className="text-text-primary">Start AI Processing</strong> to detect and cluster student identities from the uploaded videos.
      </p>
      <button onClick={onStart}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_24px_rgba(59,130,246,0.3)]">
        <Play className="w-4 h-4" />Start AI Processing
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════════ */
function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      onClick={onDismiss}
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] max-w-lg w-full mx-4 flex items-center gap-3 px-5 py-3.5 bg-[#0D0F24]/95 border border-white/[0.15] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl cursor-pointer"
    >
      <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-purple-500 shrink-0" />
      <p className="text-sm text-text-primary flex-1">{msg}</p>
      <X className="w-4 h-4 text-text-muted shrink-0" />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function FaceEnrollmentPage() {
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
  const [clusters, setClusters] = useState<Cluster[]>(MOCK_CLUSTERS);
  const [activeId, setActiveId] = useState<string | null>("sess-001");
  const [filter, setFilter] = useState<"ALL" | ClusterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Cluster | null>(null);
  const [galleryTarget, setGalleryTarget] = useState<Cluster | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pushToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const active = sessions.find(s => s.id === activeId);

  const sessionClusters = clusters.filter(c => c.sessionId === activeId);
  const counts = {
    all: sessionClusters.length,
    unassigned: sessionClusters.filter(c => c.status === "UNASSIGNED").length,
    assigned: sessionClusters.filter(c => c.status === "ASSIGNED").length,
    rejected: sessionClusters.filter(c => c.status === "REJECTED").length,
  };

  const visible = sessionClusters
    .filter(c => filter === "ALL" || c.status === filter)
    .filter(c => !search || `cluster ${c.clusterNumber}`.includes(search.toLowerCase()));

  const handleStartProcessing = () => {
    if (!active) return;
    setSessions(p => p.map(s => s.id === activeId ? { ...s, status: "PROCESSING" } : s));
    let prog = 0;
    const iv = setInterval(() => {
      prog += 1.5;
      setSessions(p => p.map(s => s.id === activeId ? { ...s, progressPercentage: Math.min(prog, 100), processedFrames: Math.round(prog * 246) } : s));
      if (prog >= 100) {
        clearInterval(iv);
        setSessions(p => p.map(s => s.id === activeId ? { ...s, status: "REVIEW_REQUIRED", detectedFacesCount: 24684, generatedClusters: 3 } : s));
        pushToast("✅ AI processing complete. 3 student identities detected and clustered. Ready for review.");
      }
    }, 100);
  };

  const handleFinalize = () => {
    setSessions(p => p.map(s => s.id === activeId ? { ...s, status: "COMPLETED" } : s));
    pushToast("🎉 Session finalized. All verified biometrics written to the FAISS vector database.");
  };

  const handleAssigned = (clusterId: string, name: string) => {
    setClusters(p => p.map(c => c.id === clusterId ? { ...c, status: "ASSIGNED", assignedStudentName: name } : c));
    setAssignTarget(null);
    pushToast(`✅ "${name}" enrolled. ArcFace embedding stored and FAISS index updated.`);
  };

  const handleReject = (id: string) => {
    setClusters(p => p.map(c => c.id === id ? { ...c, status: "REJECTED" } : c));
    pushToast("Cluster rejected and excluded from biometric database.");
  };

  const handleCreated = (s: Session) => {
    setSessions(p => [s, ...p]);
    setActiveId(s.id);
    setShowCreate(false);
    pushToast(`🎬 Session "${s.name}" created. Upload videos and start AI processing.`);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#06080F]">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showCreate  && <CreateSessionModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
        {assignTarget && <AssignModal cluster={assignTarget} onClose={() => setAssignTarget(null)} onDone={handleAssigned} />}
        {galleryTarget && <GalleryModal cluster={galleryTarget} onClose={() => setGalleryTarget(null)} />}
      </AnimatePresence>

      {/* ═══ LEFT SIDEBAR ═══════════════════════════════════════════ */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-white/[0.07] bg-[#080A18]/70 backdrop-blur-2xl">

        {/* Header */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                <Video className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary">Sessions</h2>
                <p className="text-[10px] text-text-muted">{sessions.length} enrollment sessions</p>
              </div>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 hover:bg-blue-500/25 text-blue-400 flex items-center justify-center transition-all"
              title="New Session">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Global mini-stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { n: sessions.length, l: "Sessions", c: "text-text-primary" },
              { n: clusters.filter(c => c.status === "ASSIGNED").length, l: "Enrolled", c: "text-emerald-400" },
              { n: clusters.filter(c => c.status === "UNASSIGNED").length, l: "Pending", c: "text-amber-400" },
            ].map(({ n, l, c }) => (
              <div key={l} className="bg-white/[0.03] rounded-xl py-2 border border-white/[0.07]">
                <p className={cn("text-sm font-bold", c)}>{n}</p>
                <p className="text-[9px] text-text-muted uppercase tracking-wider">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.map(s => (
            <SessionItem key={s.id} s={s} active={s.id === activeId} onClick={() => setActiveId(s.id)} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="p-4 border-t border-white/[0.07]">
          <button onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.04] hover:bg-blue-500/10 border border-white/[0.08] hover:border-blue-500/30 text-text-muted hover:text-blue-400 rounded-xl text-xs font-medium transition-all">
            <Plus className="w-3.5 h-3.5" />New Enrollment Session
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {active ? (
          <>
            {/* ── Session Header ── */}
            <div className="px-6 py-4 border-b border-white/[0.07] bg-[#080A18]/50 backdrop-blur-xl shrink-0">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h1 className="text-lg font-bold text-text-primary">{active.name}</h1>
                    <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded-full border uppercase tracking-wider", STATUS_META[active.status].badge)}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", STATUS_META[active.status].dot)} />
                      {STATUS_META[active.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {active.department} · {active.program} · {active.semester} · {active.section}
                    {active.subject && ` · ${active.subject}`}
                    {active.teacher && ` · ${active.teacher}`}
                    {` · ${active.lectureDate} ${active.lectureTime}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {active.status === "PENDING" && (
                    <button onClick={handleStartProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <Play className="w-4 h-4" />Start AI Processing
                    </button>
                  )}
                  {active.status === "REVIEW_REQUIRED" && counts.unassigned === 0 && (
                    <button onClick={handleFinalize}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <Shield className="w-4 h-4" />Finalize & Update FAISS
                    </button>
                  )}
                  {active.status === "REVIEW_REQUIRED" && counts.unassigned > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-amber-400 font-medium">{counts.unassigned} cluster{counts.unassigned > 1 ? "s" : ""} need review</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-3 flex-wrap">
                <StatChip icon={FileVideo} label="Videos" value={active.totalVideos} color="text-blue-400" />
                <StatChip icon={ImageIcon} label="Frames" value={active.processedFrames > 0 ? active.processedFrames.toLocaleString() : "—"} color="text-purple-400" />
                <StatChip icon={ScanFace} label="Faces" value={active.detectedFacesCount > 0 ? active.detectedFacesCount.toLocaleString() : "—"} color="text-cyan-400" />
                <StatChip icon={Users} label="Clusters" value={active.generatedClusters || "—"} color="text-amber-400" />
                <StatChip icon={CheckCircle2} label="Enrolled" value={counts.assigned} color="text-emerald-400" />
                <StatChip icon={Database} label="In FAISS" value={counts.assigned} color="text-indigo-400" />
              </div>

              {/* Progress */}
              {active.status === "PROCESSING" && (
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
                    <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-blue-400" /><span>AI pipeline processing {active.totalVideos} videos…</span></span>
                    <span className="font-mono">{Math.round(active.progressPercentage)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                      style={{ width: `${active.progressPercentage}%` }} transition={{ duration: 0.15 }} />
                  </div>
                  <div className="flex gap-3 mt-2 text-[10px] font-mono text-text-muted">
                    <span>Frames: {active.processedFrames.toLocaleString()}</span>
                    <span>·</span>
                    <span>YOLO · RetinaFace · ArcFace · HDBSCAN</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Cluster Toolbar ── */}
            <div className="px-6 py-3 border-b border-white/[0.07] shrink-0 flex items-center gap-3 bg-[#080A18]/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clusters…"
                  className="bg-white/[0.04] border border-white/[0.1] rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-blue-500/50 placeholder:text-text-muted w-48 transition-all" />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {([
                  ["ALL",        `All (${counts.all})`],
                  ["UNASSIGNED", `Pending (${counts.unassigned})`],
                  ["ASSIGNED",   `Enrolled (${counts.assigned})`],
                  ["REJECTED",   `Rejected (${counts.rejected})`],
                ] as const).map(([f, label]) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all",
                      filter === f
                        ? f === "UNASSIGNED" ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                        : f === "ASSIGNED"   ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : f === "REJECTED"   ? "bg-red-500/15 border-red-500/35 text-red-400"
                        : "bg-blue-500/15 border-blue-500/40 text-blue-400"
                        : "bg-white/[0.03] border-white/[0.08] text-text-muted hover:bg-white/[0.06]"
                    )}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-text-muted">
                <Zap className="w-3 h-3" />
                <span>HDBSCAN clustered · ArcFace 512-D embeddings</span>
              </div>
            </div>

            {/* ── Cluster Grid ── */}
            <div className="flex-1 overflow-y-auto p-6">
              {visible.length === 0 ? (
                <EmptyState status={active.status} onStart={handleStartProcessing} />
              ) : (
                <div className="grid gap-4"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                  {visible.map((c, i) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <ClusterCard c={c} onAssign={setAssignTarget} onReject={handleReject} onGallery={setGalleryTarget} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── No Session Selected ── */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 rounded-3xl bg-blue-500/8 border border-blue-500/15 flex items-center justify-center mb-6">
              <Camera className="w-12 h-12 text-blue-400/60" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-3">AI Automatic Enrollment</h2>
            <p className="text-sm text-text-muted max-w-sm leading-relaxed mb-8">
              Upload classroom lecture videos. The AI detects every student, clusters face appearances, and prepares them for biometric enrollment — all automatically.
            </p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_24px_rgba(59,130,246,0.3)]">
              <Plus className="w-4 h-4" />Create Enrollment Session
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
