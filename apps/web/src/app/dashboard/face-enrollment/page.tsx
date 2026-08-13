"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Upload, Users, CheckCircle2, XCircle,
  Play, Eye, UserPlus, GitMerge, Trash2, Star,
  ScanFace, Loader2, Search, ChevronRight,
  Plus, BarChart3, Zap, Shield,
  X, Image as ImageIcon, RotateCcw, AlertTriangle,
  Clock, Cpu, Database, TrendingUp, Camera, FileVideo, RefreshCw,
  Layers, Sparkles, Fingerprint
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { apiRequest, getAccessToken } from "@/lib/api/client";

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════ */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const AI_BASE  = process.env.NEXT_PUBLIC_AI_URL   || "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════ */
type SessionStatus = "PENDING" | "PROCESSING" | "REVIEW_REQUIRED" | "COMPLETED" | "FAILED" | "STOPPED" | "CANCELLED";
type ClusterStatus = "UNASSIGNED" | "ASSIGNED" | "REJECTED";

interface Session {
  id: string; name: string; department: string; program: string;
  semester: string; section: string; subject: string; teacher: string;
  lectureDate: string; lectureTime: string; status: SessionStatus;
  totalVideos: number; progressPercentage: number;
  processedFrames: number; detectedFacesCount: number;
  evaluatedFrames?: number;
  framesWithFaces?: number;
  currentFrameFaces?: number;
  activeDetector?: string;
  activeTracks?: number;
  totalTracks?: number;
  qualitySamples?: number;
  arcfaceEmbeddings?: number;
  processingFps?: number;
  generatedClusters: number; createdAt: string;
  // from API
  departmentId?: string; programId?: string; semesterId?: string;
  sectionId?: string; subjectId?: string; teacherId?: string;
  institutionId?: string;
}

interface ClusterImage {
  id: string; frameNumber: number; videoFileName: string;
  timestampSec: number; qualityScore: number; isBest: boolean;
  imageUrl?: string | null;
}

interface Cluster {
  id: string; sessionId: string; clusterNumber: number;
  sampleCount: number; qualityAvg: number; confidence: number;
  firstSeenTime: string; lastSeenTime: string;
  status: ClusterStatus; images: ClusterImage[];
  assignedStudentName?: string;
  bestImageUrl?: string | null;
  bestImagePath?: string | null;
}

/* ═══════════════════════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════════════════════ */
async function authFetch(url: string, opts: RequestInit = {}) {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...opts, headers, credentials: "include" });
}

/* Convert API session shape to our frontend Session type */
function LiveTrackingImage({ sessionId }: { sessionId: string }) {
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | null>(null);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkFrame = () => {
      const img = new Image();
      const testUrl = `${AI_BASE}/api/v1/sessions/${sessionId}/live-frame?t=${Date.now()}`;
      img.onload = () => {
        if (isMounted) {
          setActiveFrameUrl(testUrl);
          setHasFrame(true);
        }
      };
      img.onerror = () => {
        // Keeps previous activeFrameUrl if frame not ready or between writes
      };
      img.src = testUrl;
    };

    checkFrame();
    const interval = setInterval(checkFrame, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/80">
      {!hasFrame && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted text-xs gap-2.5 p-4 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="font-semibold text-text-secondary">SCRFD 10G Live Face Tracker Active</span>
          <span className="text-[11px] text-text-muted max-w-xs leading-relaxed">
            Streaming live detection bounding boxes as classroom frames are evaluated...
          </span>
        </div>
      )}
      {activeFrameUrl && (
        <img
          src={activeFrameUrl}
          alt="AI Live Face Tracking Feed"
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}

function mapSession(s: any): Session {
  const ai = s.aiStatus || {};
  const diag = ai.diagnostics || {};
  return {
    id: s.id,
    name: s.name || `Session ${s.id.slice(-6)}`,
    department: s.department || s.departmentId || "—",
    program: s.program || s.programId || "B.Tech",
    semester: s.semester || s.semesterId || "—",
    section: s.section || s.sectionId || "—",
    subject: s.subject || s.subjectId || "",
    teacher: s.teacher || s.teacherId || "",
    lectureDate: s.lectureDate || "",
    lectureTime: s.lectureTime || "",
    status: ai.status || s.status || "PENDING",
    totalVideos: s.totalVideos || s.videos?.length || 0,
    progressPercentage: ai.progressPercentage ?? s.progressPercentage ?? 0,
    processedFrames: ai.processedFrames ?? ai.evaluated_frames ?? s.processedFrames ?? 0,
    evaluatedFrames: ai.evaluated_frames ?? ai.processedFrames ?? s.evaluatedFrames ?? s.processedFrames ?? 0,
    framesWithFaces: ai.frames_with_faces ?? diag.frames_with_faces ?? s.framesWithFaces ?? 0,
    detectedFacesCount: ai.detectedFacesCount ?? ai.face_detections ?? s.detectedFacesCount ?? 0,
    currentFrameFaces: ai.current_frame_faces ?? s.currentFrameFaces ?? 0,
    activeDetector: ai.activeDetector ?? diag.active_detector ?? s.activeDetector ?? "SCRFD 10G",
    activeTracks: ai.activeTracks ?? diag.active_tracks ?? s.activeTracks ?? 0,
    totalTracks: ai.totalTracks ?? diag.total_tracks ?? s.totalTracks ?? 0,
    qualitySamples: ai.qualitySamples ?? diag.quality_samples ?? s.qualitySamples ?? 0,
    arcfaceEmbeddings: ai.arcfaceEmbeddings ?? diag.arcface_embeddings ?? s.arcfaceEmbeddings ?? 0,
    processingFps: ai.processingFps ?? diag.processing_fps ?? s.processingFps ?? 0.0,
    generatedClusters: ai.generatedClusters ?? s.generatedClusters ?? s._count?.studentClusters ?? 0,
    createdAt: s.createdAt || new Date().toISOString(),
    institutionId: s.institutionId,
    departmentId: s.departmentId,
  };
}

/* Convert API cluster shape to our frontend Cluster type */
function mapCluster(c: any, sessionId: string): Cluster {
  const images: ClusterImage[] = (c.gallery || c.images || []).map((img: any, i: number) => {
    // If img is a string URL (from AI service gallery), convert
    if (typeof img === "string") {
      return {
        id: `${c.id}-img-${i}`,
        frameNumber: i,
        videoFileName: "",
        timestampSec: 0,
        qualityScore: 0.85,
        isBest: img.includes("best.jpg"),
        imageUrl: img.startsWith("/") ? `${AI_BASE}${img}` : img,
      };
    }
    return {
      id: img.id || `${c.id}-img-${i}`,
      frameNumber: img.frameNumber || i,
      videoFileName: img.videoFileName || "",
      timestampSec: img.timestampSec || 0,
      qualityScore: img.qualityScore || 0.85,
      isBest: img.isBest || false,
      imageUrl: img.imageUrl || (img.imagePath ? `${AI_BASE}/storage/${img.imagePath.split("/storage/")[1] || ""}` : null),
    };
  });

  return {
    id: c.id || c.clusterId,
    sessionId: c.sessionId || c.enrollmentSessionId || sessionId,
    clusterNumber: c.clusterNumber || 0,
    sampleCount: c.sampleCount || 0,
    qualityAvg: c.qualityAvg || 0,
    confidence: c.confidence || 0.85,
    firstSeenTime: c.firstSeenTime || "00:00",
    lastSeenTime: c.lastSeenTime || "00:00",
    status: c.status || "UNASSIGNED",
    images,
    assignedStudentName: c.assignedStudent?.fullName || c.assignedStudentName,
    bestImageUrl: c.bestImageUrl
      ? (c.bestImageUrl.startsWith("/") ? `${AI_BASE}${c.bestImageUrl}` : c.bestImageUrl)
      : (images[0]?.imageUrl || null),
    bestImagePath: c.bestImagePath || null,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   STATUS META
═══════════════════════════════════════════════════════════════════ */
const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING:          { label: "Pending",         dot: "bg-slate-400",              badge: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  PROCESSING:       { label: "Processing",      dot: "bg-blue-400 animate-pulse", badge: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  REVIEW_REQUIRED:  { label: "Review Required", dot: "bg-amber-400 animate-pulse",badge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  COMPLETED:        { label: "Completed",       dot: "bg-emerald-400",            badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  FAILED:           { label: "Failed",          dot: "bg-red-400",                badge: "text-red-400 bg-red-500/10 border-red-500/30" },
  STOPPED:          { label: "Stopped",         dot: "bg-amber-400",              badge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  CANCELLED:        { label: "Cancelled",       dot: "bg-amber-400",              badge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  UNASSIGNED:       { label: "Unassigned",      dot: "bg-slate-400",              badge: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  ASSIGNED:         { label: "Assigned",        dot: "bg-emerald-400",            badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  REJECTED:         { label: "Rejected",        dot: "bg-red-400",                badge: "text-red-400 bg-red-500/10 border-red-500/30" },
};

/* ═══════════════════════════════════════════════════════════════════
   FACE AVATAR — biometric-style AI face placeholder
═══════════════════════════════════════════════════════════════════ */
const AVATAR_PALETTES = [
  { from: "#3B82F6", to: "#8B5CF6" },
  { from: "#06B6D4", to: "#3B82F6" },
  { from: "#10B981", to: "#06B6D4" },
  { from: "#F59E0B", to: "#EF4444" },
  { from: "#8B5CF6", to: "#EC4899" },
  { from: "#EF4444", to: "#F59E0B" },
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
      <circle cx={half} cy={half} r={half} fill={`url(#${svgId})`} />
      <circle cx={half} cy={half} r={half - 0.5} fill="none" stroke={p.from} strokeOpacity="0.35" strokeWidth="1" />
      <g clipPath={`url(#clip-${svgId})`}>
        <ellipse cx={half} cy={half * 0.9} rx={size * 0.22} ry={size * 0.26}
          fill={`url(#lg-${svgId})`} fillOpacity="0.7" />
        <ellipse cx={half} cy={size * 1.1} rx={size * 0.38} ry={size * 0.22}
          fill={`url(#lg-${svgId})`} fillOpacity="0.4" />
        {[0.35, 0.52, 0.68].map((y, i) => (
          <line key={i} x1={half - r * 0.6} y1={size * y} x2={half + r * 0.6} y2={size * y}
            stroke={p.from} strokeOpacity="0.2" strokeWidth="0.5" />
        ))}
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
      <circle cx={half} cy={half} r={half - 1} fill="none"
        stroke={`url(#lg-${svgId})`} strokeWidth="1.5" strokeOpacity="0.5"
        strokeDasharray={`${half} ${half}`} strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CLUSTER FACE — shows real image with FaceAvatar fallback
═══════════════════════════════════════════════════════════════════ */
function ClusterFace({ cluster, size = 72 }: { cluster: Cluster; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgUrl = cluster.bestImageUrl;

  if (imgUrl && !imgFailed) {
    return (
      <img
        src={imgUrl}
        alt={`Cluster #${cluster.clusterNumber}`}
        onError={() => setImgFailed(true)}
        className="rounded-full object-cover border border-glass-border"
        style={{ width: size, height: size }}
      />
    );
  }
  return <FaceAvatar id={cluster.id} size={size} />;
}

/* ═══════════════════════════════════════════════════════════════════
   STAT CHIP
═══════════════════════════════════════════════════════════════════ */
function StatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-glass-light border border-glass-border">
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
    name: "", department: "CSE", program: "B.Tech", semester: "7",
    section: "A", subject: "", teacher: "", lectureDate: new Date().toISOString().split("T")[0], lectureTime: "09:00",
  });
  const [videos, setVideos] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value })),
  });

  const inputCls = "w-full bg-glass-light border border-glass-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-blue-500/60 focus:bg-blue-500/5 placeholder:text-text-muted transition-all";
  const labelCls = "block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      // Step 1: Create the session
      const sessionName = form.name || `${form.department} ${form.semester}th Sem — ${form.subject || "Lecture"}`;
      const res = await authFetch(`${API_BASE}/enrollment/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sessionName,
          institutionId: "inst_default", // will be resolved server-side
          department: form.department,
          program: form.program,
          semester: `${form.semester}th Semester`,
          section: `Section ${form.section}`,
          subject: form.subject,
          teacher: form.teacher,
          lectureDate: form.lectureDate,
          lectureTime: form.lectureTime,
        }),
      });

      const sessionData = await res.json();
      const session = sessionData.data || sessionData;

      if (!session?.id) throw new Error(sessionData.message || "Failed to create session");

      // Step 2: Upload videos if any
      if (videos.length > 0) {
        const fd = new FormData();
        videos.forEach(v => fd.append("videos", v));
        await authFetch(`${API_BASE}/enrollment/sessions/${session.id}/upload`, {
          method: "POST",
          body: fd,
        });
      }

      onCreated(mapSession({
        ...session,
        name: sessionName,
        totalVideos: videos.length,
        status: "PENDING",
      }));
    } catch (err: any) {
      setError(err.message || "Failed to create session. Is the API running?");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div className="absolute inset-0 bg-bg-primary/75 backdrop-blur-xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-xl bg-bg-secondary border border-glass-border rounded-2xl shadow-glow-blue overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

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
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex px-6 gap-2 mb-5">
          {[1, 2].map(s => (
            <div key={s} className={cn("h-0.5 flex-1 rounded-full transition-all duration-500",
              step >= s ? "bg-blue-500" : "bg-glass-medium")} />
          ))}
        </div>

        {error && (
          <div className="mx-6 mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                <div>
                  <label className={labelCls}>Session Name</label>
                  <input placeholder="e.g. CSE 7th Sem — Room 408" className={inputCls} {...field("name")} />
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
                    <input placeholder="e.g. AI & ML" className={inputCls} {...field("subject")} />
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
                  className="w-full border-2 border-dashed border-glass-border hover:border-blue-500/40 bg-glass-light hover:bg-blue-500/5 rounded-xl p-8 text-center transition-all group">
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
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-glass-light border border-glass-border">
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
                    The AI pipeline processes frames at 1 FPS, runs InsightFace detection, ArcFace embedding, and greedy identity clustering automatically.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setStep(1)}
                    className="px-5 py-2.5 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-secondary text-sm font-medium rounded-xl transition-all">
                    ← Back
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {creating ? "Creating…" : "Create Session"}
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
function AssignModal({ cluster, onClose, onDone }: { cluster: Cluster; onClose: () => void; onDone: (id: string, name: string) => void }) {
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [confirmStep, setConfirmStep] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<{ name: string; usn: string; existingId?: string; form?: any } | null>(null);

  const [form, setForm] = useState({
    name: "", usn: "", email: "", phone: "", dept: "CSE", sem: "7", section: "A"
  });
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "existing") {
      setLoadingStudents(true);
      authFetch(`${API_BASE}/students`)
        .then(r => r.json())
        .then(d => { setStudents(Array.isArray(d) ? d : d.data || []); })
        .catch(() => {})
        .finally(() => setLoadingStudents(false));
    }
  }, [tab]);

  const filtered = students.filter(s =>
    !search || s.fullName?.toLowerCase().includes(search.toLowerCase()) || s.usn?.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full bg-glass-light border border-glass-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-muted transition-all";
  const labelCls = "block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5";

  const handlePrepareNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.usn) {
      setError("Please fill in Student Name and USN");
      return;
    }
    setError(null);
    setPendingStudent({ name: form.name, usn: form.usn, form });
    setConfirmStep(true);
  };

  const handlePrepareExisting = (student: any) => {
    setError(null);
    setPendingStudent({ name: student.fullName, usn: student.usn || student.studentId, existingId: student.id });
    setConfirmStep(true);
  };

  const executeAssignment = async () => {
    if (!pendingStudent) return;
    setSaving(true);
    setError(null);
    try {
      let body: any = { clusterId: cluster.id };
      if (pendingStudent.existingId) {
        body.existingStudentId = pendingStudent.existingId;
      } else {
        body.fullName = pendingStudent.name;
        body.usn = pendingStudent.usn;
        body.email = pendingStudent.form?.email;
        body.phone = pendingStudent.form?.phone;
        body.department = pendingStudent.form?.dept;
        body.semester = `${pendingStudent.form?.sem}th Semester`;
        body.section = `Section ${pendingStudent.form?.section}`;
      }

      const res = await authFetch(`${API_BASE}/enrollment/clusters/assign-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Assignment failed");
      onDone(cluster.id, pendingStudent.name);
    } catch (err: any) {
      setError(err.message || "Failed to assign student");
      setConfirmStep(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div className="absolute inset-0 bg-bg-primary/75 backdrop-blur-xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-lg bg-bg-secondary border border-glass-border rounded-2xl shadow-glow-purple overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <ClusterFace cluster={cluster} size={40} />
            <div>
              <h2 className="text-sm font-bold text-text-primary">Assign Student</h2>
              <p className="text-[11px] text-text-muted">Cluster #{cluster.clusterNumber} · {cluster.sampleCount.toLocaleString()} detections · {Math.round(cluster.confidence * 100)}% consistency</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        <div className="px-6 pb-6 space-y-4">
          <AnimatePresence mode="wait">
            {tab === "existing" && (
              <motion.div key="existing" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or USN…" className={cn(inputCls, "pl-10")} />
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {loadingStudents && (
                    <div className="text-center py-6 text-text-muted text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading students…
                    </div>
                  )}
                  {!loadingStudents && filtered.map(s => (
                    <button key={s.id} type="button" onClick={() => handlePrepareExisting(s)} disabled={saving}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-glass-light border border-glass-border hover:bg-emerald-500/8 hover:border-emerald-500/30 text-left transition-all group disabled:opacity-60">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(s.fullName || "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary">{s.fullName}</p>
                        <p className="text-[11px] text-text-muted">{s.usn} · {s.department}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-emerald-400 transition-colors shrink-0" />
                    </button>
                  ))}
                  {!loadingStudents && filtered.length === 0 && (
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
  const [imgFailed, setImgFailed] = useState(false);

  // Reset imgFailed when switching images
  useEffect(() => { setImgFailed(false); }, [active]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div className="absolute inset-0 bg-bg-primary/90 backdrop-blur-2xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-5xl h-[82vh] bg-bg-secondary border border-glass-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border shrink-0">
          <div className="flex items-center gap-3">
            <ClusterFace cluster={cluster} size={38} />
            <div>
              <h2 className="text-sm font-bold text-text-primary">Cluster #{cluster.clusterNumber} — Biometric Gallery</h2>
              <p className="text-[11px] text-text-muted">{cluster.images.length} captured frames · {cluster.sampleCount.toLocaleString()} total detections · {Math.round(cluster.confidence * 100)}% identity confidence</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Viewer */}
          <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary/40 relative p-8">
            <div className="relative">
              <div className="w-52 h-52 rounded-2xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-glass-border flex items-center justify-center relative overflow-hidden shadow-2xl">
                {img?.imageUrl && !imgFailed ? (
                  <img
                    src={img.imageUrl}
                    alt={`Frame #${img.frameNumber}`}
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <FaceAvatar id={`${cluster.id}-${active}`} size={160} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent animate-[slideDown_2s_ease-in-out_infinite]" />
                  </>
                )}
                {img?.isBest && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-2 py-1">
                    <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                    <span className="text-[9px] text-yellow-400 font-bold">BEST FRAME</span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-bg-tertiary border border-glass-border rounded-full px-3 py-1 flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", (img?.qualityScore || 0) >= 0.9 ? "bg-emerald-400" : "bg-yellow-400")} />
                <span className="text-[10px] font-mono text-text-primary">{Math.round((img?.qualityScore || 0) * 100)}% quality</span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-sm">
              {[
                { label: "Frame #", value: `${img?.frameNumber ?? "—"}` },
                { label: "Source", value: img?.videoFileName ? img.videoFileName.replace(/\.[^.]+$/, "").slice(-12) : "—" },
                { label: "Timestamp", value: img?.timestampSec ? `${Math.floor(img.timestampSec / 60)}m ${Math.round(img.timestampSec % 60)}s` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-2.5 rounded-xl bg-glass-light border border-glass-border">
                  <p className="text-[11px] font-semibold text-text-primary">{value}</p>
                  <p className="text-[9px] text-text-muted mt-0.5 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium transition-all">
                <Star className="w-3.5 h-3.5" />Set as Best
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-all">
                <Trash2 className="w-3.5 h-3.5" />Remove
              </button>
            </div>
          </div>

          {/* Filmstrip */}
          <div className="w-56 border-l border-glass-border flex flex-col bg-bg-primary/20 shrink-0">
            <div className="px-4 py-3 border-b border-glass-border shrink-0">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Captured Frames</p>
              <p className="text-[9px] text-text-muted mt-0.5">{cluster.images.length} images</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cluster.images.length === 0 && (
                <p className="text-xs text-text-muted text-center mt-4">No images saved</p>
              )}
              {cluster.images.map((im, i) => (
                <button key={im.id} onClick={() => setActive(i)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left",
                    active === i ? "bg-purple-500/15 border-purple-500/40" : "bg-glass-light border-glass-border hover:bg-glass-light"
                  )}>
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden",
                    active === i ? "bg-purple-500/20 border-purple-500/30" : "bg-glass-light border-glass-border")}>
                    {im.imageUrl ? (
                      <img src={im.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <ScanFace className={cn("w-4 h-4", active === i ? "text-purple-400" : "text-text-muted")} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-text-primary">Frame #{im.frameNumber}</p>
                    <p className="text-[9px] text-text-muted truncate">{im.videoFileName || "—"}</p>
                  </div>
                  {im.isBest && <Star className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" />}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-glass-border space-y-2.5 shrink-0">
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
        "border-glass-border bg-glass-light hover:border-blue-500/30 hover:bg-blue-500/5"
      )}
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-blue-500/40 transition-all duration-500" />

      <div className="flex flex-col items-center gap-3 pt-5 pb-4 px-4 relative">
        <div className={cn("absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider", sm.badge)}>
          <div className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />
          {sm.label}
        </div>

        <div className="relative">
          <ClusterFace cluster={c} size={72} />
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

      <div className="grid grid-cols-3 divide-x divide-glass-border border-y border-glass-border text-center">
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

      <div className="px-4 py-3 flex items-center justify-between text-[10px] font-mono text-text-muted border-b border-glass-border">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.firstSeenTime}</span>
        <div className="flex-1 mx-2 border-t border-dashed border-glass-border" />
        <span>{c.lastSeenTime}</span>
      </div>

      <div className="p-3 space-y-2">
        {c.status === "UNASSIGNED" && (
          <>
            <button onClick={() => onAssign(c)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_16px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.35)]">
              <UserPlus className="w-3.5 h-3.5" />Assign Student
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onGallery(c)}
                className="flex items-center justify-center gap-1.5 py-2 bg-glass-light hover:bg-purple-500/10 border border-glass-border hover:border-purple-500/30 text-text-muted hover:text-purple-400 rounded-xl text-[11px] font-medium transition-all">
                <Eye className="w-3.5 h-3.5" />Gallery
              </button>
              <button onClick={() => onReject(c.id)}
                className="flex items-center justify-center gap-1.5 py-2 bg-glass-light hover:bg-red-500/10 border border-glass-border hover:border-red-500/30 text-text-muted hover:text-red-400 rounded-xl text-[11px] font-medium transition-all">
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
function SessionItem({ s, active, onClick, onDelete }: { s: Session; active: boolean; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const sm = STATUS_META[s.status] || STATUS_META.PENDING;
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={cn(
        "w-full text-left p-3.5 rounded-xl border transition-all duration-200 group relative overflow-hidden cursor-pointer select-none",
        active ? "bg-blue-500/10 border-blue-500/35 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
               : "bg-glass-light border-glass-border hover:bg-glass-light hover:border-glass-border"
      )}>
      {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r" />}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", sm.dot)} />
          <p className="text-xs font-semibold text-text-primary truncate leading-tight">{s.name}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", sm.badge)}>{sm.label}</span>
          <button
            type="button"
            onClick={onDelete}
            title="Delete Session"
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-text-muted hover:text-red-400 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
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
          <div className="h-0.5 bg-glass-light rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${s.progressPercentage}%` }} />
          </div>
        </div>
      )}
    </div>
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
          InsightFace detection · ArcFace embedding · Identity clustering in progress…
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
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] max-w-lg w-full mx-4 flex items-center gap-3 px-5 py-3.5 bg-bg-tertiary/95 border border-glass-border rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl cursor-pointer"
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | ClusterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Cluster | null>(null);
  const [galleryTarget, setGalleryTarget] = useState<Cluster | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  const [selectedDetector, setSelectedDetector] = useState<string>("scrfd");
  const wsRef = useRef<WebSocket | null>(null);

  const pushToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  /* ── Load Sessions from API ── */
  const loadSessions = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/enrollment/sessions`);
      const data = await res.json();
      const list: Session[] = (data.data || data || []).map(mapSession);
      setSessions(list);
      // Auto-select first session
      if (list.length > 0 && !activeId) {
        setActiveId(list[0].id);
      }
    } catch {
      // API not running — show empty state gracefully
    } finally {
      setLoadingSessions(false);
    }
  }, [activeId]);

  useEffect(() => { loadSessions(); }, []);

  /* ── Load Clusters for Active Session ── */
  const loadClusters = useCallback(async (sessionId: string) => {
    setLoadingClusters(true);
    try {
      const res = await authFetch(`${API_BASE}/enrollment/sessions/${sessionId}/clusters`);
      const data = await res.json();
      const list: Cluster[] = (data.data || data || []).map((c: any) => mapCluster(c, sessionId));
      setClusters(prev => {
        // Keep clusters from other sessions, replace for this session
        const other = prev.filter(c => c.sessionId !== sessionId);
        return [...other, ...list];
      });
    } catch {
      // ignore
    } finally {
      setLoadingClusters(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) loadClusters(activeId);
  }, [activeId, loadClusters]);

  const sessionsRef = useRef(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  /* ── Real-Time Auto-Refresh for Active Processing Sessions ── */
  useEffect(() => {
    const interval = setInterval(async () => {
      const isProcessing = sessionsRef.current.some(s => s.status === "PROCESSING");
      if (!isProcessing) return;

      try {
        const res = await authFetch(`${API_BASE}/enrollment/sessions`);
        if (!res.ok) return;
        const data = await res.json();
        const list: Session[] = (data.data || data || []).map(mapSession);

        const prev = sessionsRef.current;
        list.forEach(newS => {
          const oldS = prev.find(p => p.id === newS.id);
          if (oldS && oldS.status === "PROCESSING" && (newS.status === "REVIEW_REQUIRED" || newS.status === "COMPLETED")) {
            authFetch(`${API_BASE}/enrollment/sessions/${newS.id}/sync-clusters`, { method: "POST" })
              .then(() => loadClusters(newS.id));
            pushToast(`✅ AI processing complete for session "${newS.name}"!`);
          }
        });

        setSessions(list);
      } catch {
        /* transient fetch error */
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [loadClusters]);

  /* ── WebSocket for real-time processing updates ── */
  const connectWs = useCallback((sessionId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = `${AI_BASE.replace("http", "ws")}/api/v1/ws/${sessionId}`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.event === "PROCESSING_PROGRESS") {
            setSessions(prev => prev.map(s => s.id === sessionId ? {
              ...s,
              progressPercentage: msg.progressPercentage ?? s.progressPercentage,
              processedFrames: msg.processedFrames ?? msg.evaluated_frames ?? s.processedFrames,
              evaluatedFrames: msg.evaluated_frames ?? msg.processedFrames ?? s.evaluatedFrames ?? s.processedFrames,
              framesWithFaces: msg.frames_with_faces ?? msg.diagnostics?.frames_with_faces ?? s.framesWithFaces ?? 0,
              detectedFacesCount: msg.detectedFacesCount ?? msg.face_detections ?? s.detectedFacesCount,
              currentFrameFaces: msg.current_frame_faces ?? s.currentFrameFaces ?? 0,
              generatedClusters: msg.generatedClusters ?? s.generatedClusters,
            } : s));
          }
          if (msg.event === "ENROLLMENT_COMPLETED") {
            // Pipeline done — sync clusters from AI to DB, then reload
            authFetch(`${API_BASE}/enrollment/sessions/${sessionId}/sync-clusters`, { method: "POST" })
              .then(() => loadClusters(sessionId))
              .then(() => loadSessions());
            setSessions(prev => prev.map(s => s.id === sessionId ? {
              ...s, status: "REVIEW_REQUIRED", progressPercentage: 100,
              generatedClusters: msg.totalClusters || s.generatedClusters,
            } : s));
            pushToast(`✅ AI processing complete! ${msg.totalClusters || 0} identities detected. Review clusters below.`);
            ws.close();
          }
        } catch { /* bad JSON */ }
      };

      ws.onerror = () => {
        // WS failed — poll instead
        pollProgress(sessionId);
      };
    } catch {
      pollProgress(sessionId);
    }
  }, [loadClusters, loadSessions]);

  /* ── Fallback polling when WebSocket unavailable ── */
  const pollProgress = useCallback((sessionId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await authFetch(`${API_BASE}/enrollment/sessions/${sessionId}/status`);
        const data = await res.json();
        const session = data.data || data;
        setSessions(prev => prev.map(s => s.id === sessionId ? mapSession({ ...s, ...session }) : s));

        if (session.status === "REVIEW_REQUIRED" || session.status === "COMPLETED" || session.status === "FAILED") {
          clearInterval(interval);
          if (session.status === "REVIEW_REQUIRED") {
            await loadClusters(sessionId);
            pushToast("✅ Processing complete! Clusters are ready for review.");
          }
        }
      } catch { /* ignore */ }
      if (attempts > 120) clearInterval(interval); // 10 min max
    }, 5000);
    return () => clearInterval(interval);
  }, [loadClusters]);

  /* ── Start AI Processing ── */
  const handleStartProcessing = useCallback(async () => {
    if (!activeId) return;
    setProcessingSessionId(activeId);
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "PROCESSING", progressPercentage: 5 } : s));

    try {
      const res = await authFetch(`${API_BASE}/enrollment/sessions/${activeId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detector: selectedDetector }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.message || "Failed to start processing";
        setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "FAILED" } : s));
        pushToast(`❌ ${errMsg}`);
        return;
      }
      pushToast("🚀 AI pipeline started! Processing classroom video frames…");
      // Connect WebSocket for real-time updates
      connectWs(activeId);
    } catch (err: any) {
      setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "PENDING" } : s));
      pushToast(`❌ ${err.message || "Could not start processing. Is the AI service running?"}`);
    } finally {
      setProcessingSessionId(null);
    }
  }, [activeId, connectWs]);

  /* ── Stop AI Processing ── */
  const handleStopProcessing = useCallback(async (sessionId: string) => {
    try {
      await authFetch(`${API_BASE}/enrollment/sessions/${sessionId}/stop`, { method: "POST" });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: "STOPPED" } : s));
      pushToast("🛑 AI processing stopped by user.");
    } catch {
      pushToast("❌ Failed to stop processing.");
    }
  }, []);

  /* ── Delete Session ── */
  const handleDeleteSession = useCallback(async (sessionId: string, sessionName: string) => {
    if (!confirm(`Are you sure you want to delete session "${sessionName}"? This action will remove all videos and detected identity clusters.`)) {
      return;
    }
    try {
      await authFetch(`${API_BASE}/enrollment/sessions/${sessionId}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setClusters(prev => prev.filter(c => c.sessionId !== sessionId));
      if (activeId === sessionId) {
        setActiveId(null);
      }
      pushToast(`🗑️ Session "${sessionName}" deleted.`);
    } catch {
      pushToast("❌ Failed to delete session.");
    }
  }, [activeId]);

  /* ── Finalize Session ── */
  const handleFinalize = useCallback(async () => {
    if (!activeId) return;
    try {
      await authFetch(`${API_BASE}/enrollment/sessions/${activeId}/finalize`, { method: "POST" });
      setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "COMPLETED" } : s));
      pushToast("🎉 Session finalized. All verified biometrics written to the FAISS vector database.");
    } catch {
      pushToast("❌ Failed to finalize session.");
    }
  }, [activeId]);

  /* ── Cluster Actions ── */
  const handleAssigned = useCallback((clusterId: string, name: string) => {
    setClusters(prev => prev.map(c => c.id === clusterId ? { ...c, status: "ASSIGNED", assignedStudentName: name } : c));
    setAssignTarget(null);
    pushToast(`✅ "${name}" enrolled. ArcFace embedding stored and FAISS index updated.`);
  }, []);

  const handleReject = useCallback(async (id: string) => {
    setClusters(prev => prev.map(c => c.id === id ? { ...c, status: "REJECTED" } : c));
    pushToast("Cluster rejected and excluded from biometric database.");
    // Optionally call API to persist rejection
    try {
      await authFetch(`${API_BASE}/enrollment/clusters/${id}/reject`, { method: "POST" });
    } catch { /* best-effort */ }
  }, []);

  const handleCreated = useCallback((s: Session) => {
    setSessions(prev => [s, ...prev]);
    setActiveId(s.id);
    setShowCreate(false);
    pushToast(`🎬 Session "${s.name}" created. Start AI processing when ready.`);
  }, []);

  // Cleanup WS on unmount
  useEffect(() => () => { wsRef.current?.close(); }, []);

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
    .filter(c => !search || `cluster ${c.clusterNumber}`.includes(search.toLowerCase()) ||
      (c.assignedStudentName && c.assignedStudentName.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-bg-primary">

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
      <aside className="w-72 shrink-0 flex flex-col border-r border-glass-border bg-glass-medium backdrop-blur-2xl">

        {/* Header */}
        <div className="px-4 pt-5 pb-4 border-b border-glass-border">
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
            <div className="flex items-center gap-1">
              <button onClick={loadSessions} title="Refresh"
                className="w-7 h-7 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowCreate(true)}
                className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 hover:bg-blue-500/25 text-blue-400 flex items-center justify-center transition-all"
                title="New Session">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { n: sessions.length, l: "Sessions", c: "text-text-primary" },
              { n: clusters.filter(c => c.status === "ASSIGNED").length, l: "Enrolled", c: "text-emerald-400" },
              { n: clusters.filter(c => c.status === "UNASSIGNED").length, l: "Pending", c: "text-amber-400" },
            ].map(({ n, l, c }) => (
              <div key={l} className="bg-glass-light rounded-xl py-2 border border-glass-border">
                <p className={cn("text-sm font-bold", c)}>{n}</p>
                <p className="text-[9px] text-text-muted uppercase tracking-wider">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingSessions && (
            <div className="flex items-center justify-center py-8 text-text-muted text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading sessions…
            </div>
          )}
          {!loadingSessions && sessions.length === 0 && (
            <div className="text-center py-8 text-text-muted text-xs">
              <p className="mb-2">No sessions yet.</p>
              <p className="text-[10px]">Create one to get started.</p>
            </div>
          )}
          {sessions.map(s => (
            <SessionItem
              key={s.id}
              s={s}
              active={s.id === activeId}
              onClick={() => setActiveId(s.id)}
              onDelete={(e) => {
                e.stopPropagation();
                handleDeleteSession(s.id, s.name);
              }}
            />
          ))}
        </div>

        <div className="p-4 border-t border-glass-border">
          <button onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-glass-light hover:bg-blue-500/10 border border-glass-border hover:border-blue-500/30 text-text-muted hover:text-blue-400 rounded-xl text-xs font-medium transition-all">
            <Plus className="w-3.5 h-3.5" />New Enrollment Session
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {active ? (
          <>
            {/* ── Session Header ── */}
            <div className="px-6 py-4 border-b border-glass-border bg-glass-light backdrop-blur-xl shrink-0">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h1 className="text-lg font-bold text-text-primary">{active.name}</h1>
                    <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded-full border uppercase tracking-wider", (STATUS_META[active.status] || STATUS_META.PENDING).badge)}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", (STATUS_META[active.status] || STATUS_META.PENDING).dot)} />
                      {(STATUS_META[active.status] || STATUS_META.PENDING).label}
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
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedDetector}
                        onChange={(e) => setSelectedDetector(e.target.value)}
                        className="bg-black/60 text-xs font-mono text-blue-300 border border-blue-500/40 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                      >
                        <option value="scrfd">Detector: SCRFD 10G</option>
                        <option value="yolo11">Detector: YOLO11</option>
                        <option value="combined">Detector: Combined (SCRFD + YOLO11)</option>
                      </select>
                      <button onClick={handleStartProcessing} disabled={!!processingSessionId}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        {processingSessionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Start AI Processing
                      </button>
                    </div>
                  )}
                  {active.status === "REVIEW_REQUIRED" && counts.unassigned === 0 && (
                    <button onClick={handleFinalize}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <Shield className="w-4 h-4" />Finalize &amp; Update FAISS
                    </button>
                  )}
                  {active.status === "REVIEW_REQUIRED" && counts.unassigned > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-amber-400 font-medium">{counts.unassigned} cluster{counts.unassigned > 1 ? "s" : ""} need review</span>
                    </div>
                  )}
                  {active.status === "PROCESSING" && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStopProcessing(active.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold transition-all">
                        <XCircle className="w-3.5 h-3.5" />Stop Processing
                      </button>
                      <button onClick={() => loadClusters(active.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-muted rounded-xl text-xs transition-all">
                        <RefreshCw className="w-3.5 h-3.5" />Refresh
                      </button>
                    </div>
                  )}
                  <button onClick={() => handleDeleteSession(active.id, active.name)}
                    title="Delete Session"
                    className="p-2 rounded-xl bg-glass-light hover:bg-red-500/15 border border-glass-border hover:border-red-500/30 text-text-muted hover:text-red-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <StatChip icon={FileVideo} label="Videos" value={active.totalVideos} color="text-blue-400" />
                <StatChip icon={ImageIcon} label="Frames" value={(active.evaluatedFrames ?? active.processedFrames ?? 0).toLocaleString()} color="text-purple-400" />
                <StatChip icon={ScanFace} label="Detections" value={(active.detectedFacesCount ?? 0).toLocaleString()} color="text-cyan-400" />
                <StatChip icon={Layers} label="Tracks" value={(active.totalTracks ?? active.activeTracks ?? 0).toLocaleString()} color="text-yellow-400" />
                <StatChip icon={Sparkles} label="Samples" value={(active.qualitySamples ?? 0).toLocaleString()} color="text-pink-400" />
                <StatChip icon={Fingerprint} label="ArcFace 512D" value={(active.arcfaceEmbeddings ?? 0).toLocaleString()} color="text-blue-400" />
                <StatChip icon={Users} label="Clusters" value={active.generatedClusters || sessionClusters.length || 0} color="text-amber-400" />
                <StatChip icon={CheckCircle2} label="Enrolled" value={counts.assigned} color="text-emerald-400" />
              </div>

              {/* Progress & Live Tracking Feed */}
              {active.status === "PROCESSING" && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-glass-medium border border-blue-500/30 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">AI Live Face Tracking Feed</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        {active.activeDetector || (selectedDetector === "yolo11" ? "YOLO11" : selectedDetector === "combined" ? "SCRFD 10G + YOLO11" : "SCRFD 10G")} · ArcFace 512D
                      </span>
                    </div>

                    <div className="relative aspect-video max-h-64 rounded-xl overflow-hidden bg-black/60 border border-glass-border flex items-center justify-center">
                      <LiveTrackingImage sessionId={active.id} />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-text-muted mt-2 flex-wrap gap-2">
                      <span>Evaluated Frames: {(active.evaluatedFrames ?? active.processedFrames ?? 0).toLocaleString()}</span>
                      <span>Active Tracks: {active.activeTracks ?? 0}</span>
                      <span>Total Tracks: {active.totalTracks ?? active.generatedClusters ?? 0}</span>
                      <span>Quality Samples: {active.qualitySamples ?? 0}</span>
                      <span>ArcFace 512D Embeddings: {active.arcfaceEmbeddings ?? active.detectedFacesCount ?? 0}</span>
                      <span>Current Frame Faces: {active.currentFrameFaces ?? 0}</span>
                      <span>FPS: {active.processingFps ?? 0.6}</span>
                      <span>Progress: {Math.round(active.progressPercentage)}%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
                      <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-blue-400" /><span>AI pipeline processing {active.totalVideos} videos…</span></span>
                      <span className="font-mono">{Math.round(active.progressPercentage)}%</span>
                    </div>
                    <div className="h-1.5 bg-glass-light rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                        style={{ width: `${active.progressPercentage}%` }} transition={{ duration: 0.15 }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Cluster Toolbar ── */}
            <div className="px-6 py-3 border-b border-glass-border shrink-0 flex items-center gap-3 bg-glass-light">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clusters…"
                  className="bg-glass-light border border-glass-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-blue-500/50 placeholder:text-text-muted w-48 transition-all" />
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
                        : "bg-glass-light border-glass-border text-text-muted hover:bg-glass-light"
                    )}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-text-muted">
                <Zap className="w-3 h-3" />
                <span>ArcFace 512-D embeddings · Greedy identity clustering</span>
              </div>
            </div>

            {/* ── Cluster Grid ── */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingClusters ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-3 text-text-muted text-sm">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading clusters…
                  </div>
                </div>
              ) : visible.length === 0 ? (
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
