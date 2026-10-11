"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, Upload, Users, CheckCircle2, XCircle,
  Play, Eye, UserPlus, GitMerge, Trash2, Star,
  ScanFace, Loader2, Search, ChevronRight,
  Plus, BarChart3, Zap, Shield,
  X, Image as ImageIcon, RotateCcw, AlertTriangle,
  Clock, Cpu, Database, TrendingUp, Camera, FileVideo, RefreshCw,
  Layers, Sparkles, Fingerprint, UserCheck, Check, ArrowRight, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { apiRequest, getAccessToken } from "@/lib/api/client";

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════ */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
// All /storage/* paths are proxied through Next.js rewrites — use relative URLs
const AI_BASE  = "";

function resolveCropUrl(item: any): string | null {
  if (!item) return null;
  const raw = typeof item === "string" ? item : (item.imageUrl || item.imagePath || item.url || item.path || "");
  if (!raw || typeof raw !== "string") return null;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/")) return raw;
  if (raw.includes("storage/")) {
    const sub = raw.split("storage/")[1];
    return `/storage/${sub}`;
  }
  return `/storage/${raw}`;
}

/* ═══════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════ */
type SessionStatus = "PENDING" | "PROCESSING" | "REVIEW_REQUIRED" | "COMPLETED" | "FAILED" | "STOPPED" | "CANCELLED";
type ClusterStatus = "UNASSIGNED" | "ASSIGNED" | "REJECTED" | "CANDIDATE";
type IdentityStatus = "UNKNOWN" | "CANDIDATE" | "CONFIRMED" | "REJECTED";

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
  departmentId?: string; programId?: string; semesterId?: string;
  sectionId?: string; subjectId?: string; teacherId?: string;
  institutionId?: string; errorMessage?: string;
}

interface ClusterImage {
  id: string; frameNumber: number; videoFileName: string;
  timestampSec: number; qualityScore: number; isBest: boolean;
  imageUrl?: string | null;
}

interface ClusterSample {
  sampleId?: string;
  trackId?: string;
  qualityScore?: number;
  timestamp?: number;
  sourceVideo?: string;
  imageUrl?: string | null;
  imagePath?: string | null;
}

interface Cluster {
  id: string;
  clusterId: string;
  sessionId: string;
  clusterNumber: number;
  sampleCount: number;
  trackCount: number;
  qualityAvg: number;
  bestQualityScore: number;
  confidence: number;
  firstSeenTime: string;
  lastSeenTime: string;
  firstSeenSec?: number;
  lastSeenSec?: number;
  identity_status: IdentityStatus;
  status: ClusterStatus;
  assignment_source?: string;
  assignedStudent?: {
    usn: string;
    name: string;
    studentId?: string;
    confidence?: number;
    status?: string;
    source?: string;
  } | null;
  assignedStudentName?: string;
  assignedUsn?: string;
  candidateMatch?: {
    usn: string;
    name: string;
    similarity: number;
    votes: number;
  } | null;
  embeddingCount?: number;
  purity?: number;
  internalPurity?: number;
  internal_min_similarity?: number;
  internal_mean_similarity?: number;
  identity_evidence?: string;
  identityEvidence?: string;
  possible_multi_identity_cluster?: boolean;
  possibleMultiIdentity?: boolean;
  images: ClusterImage[];
  samples?: ClusterSample[];
  gallery?: string[];
  bestImageUrl?: string | null;
  bestImagePath?: string | null;
  isEnrolled?: boolean;
  enrolled?: boolean;
}

interface StudentSearchResult {
  id: string;
  studentId: string;
  rollNumber?: string;
  usn?: string;
  fullName: string;
  email?: string;
  phone?: string;
  department?: { id: string; name: string; code: string } | string;
  semester?: number | string;
  section?: string;
  faceEnrolled?: boolean;
  profilePhoto?: string;
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

function LiveTrackingImage({ sessionId }: { sessionId: string }) {
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | null>(null);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl: string | null = null;

    const checkFrame = async () => {
      try {
        const testUrl = `${AI_BASE}/api/v1/sessions/${sessionId}/live-frame?t=${Date.now()}`;
        const res = await fetch(testUrl);
        if (res.status === 200 && isMounted) {
          const blob = await res.blob();
          if (blob.size > 0 && isMounted) {
            const url = URL.createObjectURL(blob);
            if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
            currentBlobUrl = url;
            setActiveFrameUrl(url);
            setHasFrame(true);
          }
        }
      } catch {
        /* transient polling skip */
      }
    };

    checkFrame();
    const interval = setInterval(checkFrame, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [sessionId]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/80">
      {!hasFrame && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted text-xs gap-2.5 p-4 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="font-semibold text-text-secondary">Live Camera Face Tracking Active</span>
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
    progressPercentage: Math.min(100, Math.max(0, ai.progressPercentage ?? s.progressPercentage ?? 0)),
    processedFrames: ai.processedFrames ?? ai.evaluated_frames ?? s.processedFrames ?? 0,
    evaluatedFrames: ai.evaluated_frames ?? ai.processedFrames ?? s.evaluatedFrames ?? s.processedFrames ?? 0,
    framesWithFaces: ai.frames_with_faces ?? diag.frames_with_faces ?? s.framesWithFaces ?? 0,
    detectedFacesCount: ai.detectedFacesCount ?? ai.face_detections ?? s.detectedFacesCount ?? 0,
    currentFrameFaces: ai.current_frame_faces ?? s.currentFrameFaces ?? 0,
    activeDetector: ai.activeDetector ?? diag.active_detector ?? s.activeDetector ?? "YOLO26-S-Face",
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

function mapCluster(c: any, sessionId: string): Cluster {
  const cid = c.clusterId || c.cluster_id || (c.clusterNumber ? `cluster_${String(c.clusterNumber).padStart(3, '0')}` : (c.id || "cluster_001"));
  const num = c.clusterNumber || c.cluster_number || (typeof c.clusterId === "string" && c.clusterId.startsWith("cluster_") ? parseInt(c.clusterId.split("_")[1], 10) : 1);

  const rawImages = Array.isArray(c.gallery) ? c.gallery : (Array.isArray(c.images) ? c.images : []);
  const images: ClusterImage[] = rawImages.map((img: any, i: number) => {
    const srcUrl = resolveCropUrl(img);
    const isBest = typeof img === "string" ? img.includes("best.jpg") : Boolean(img?.isBest);
    return {
      id: (img && typeof img === "object" && img.id) ? img.id : `${cid}-img-${i}`,
      frameNumber: (img && typeof img === "object" && img.frameNumber) ? img.frameNumber : i,
      videoFileName: (img && typeof img === "object" && img.videoFileName) ? img.videoFileName : "",
      timestampSec: (img && typeof img === "object" && img.timestampSec) ? img.timestampSec : 0,
      qualityScore: (img && typeof img === "object" && img.qualityScore) ? img.qualityScore : 0.85,
      isBest: isBest || i === 0,
      imageUrl: srcUrl,
    };
  });

  const rawSamples = Array.isArray(c.samples) ? c.samples : [];
  const samples: ClusterSample[] = rawSamples.map((s: any) => ({
    sampleId: s.sampleId || `s-${Math.random().toString(36).substring(2, 7)}`,
    trackId: s.trackId || "track_001",
    qualityScore: s.qualityScore || 85.0,
    timestamp: s.timestamp || 0.0,
    sourceVideo: s.sourceVideo || "",
    imageUrl: resolveCropUrl(s.imageUrl || s.imagePath),
    imagePath: typeof s.imagePath === "string" ? s.imagePath : undefined,
  }));

  const identityStatus: IdentityStatus = c.identity_status || (
    c.status === "ASSIGNED" ? "CONFIRMED" :
    c.status === "REJECTED" ? "REJECTED" :
    c.status === "CANDIDATE" ? "CANDIDATE" : "UNKNOWN"
  );

  const status: ClusterStatus = c.status || (
    identityStatus === "CONFIRMED" ? "ASSIGNED" :
    identityStatus === "REJECTED" ? "REJECTED" :
    identityStatus === "CANDIDATE" ? "CANDIDATE" : "UNASSIGNED"
  );

  const bestImg = resolveCropUrl(c.bestImageUrl || c.bestImagePath || (images.length > 0 ? images[0].imageUrl : null));

  const assignedStudent = c.assignedStudent ? {
    usn: c.assignedStudent.usn || c.usn || "",
    name: c.assignedStudent.name || c.name || c.assignedStudentName || c.usn || "",
    studentId: c.assignedStudent.studentId || c.student_id,
    confidence: c.assignedStudent.confidence || c.confidence,
    status: c.assignedStudent.status || identityStatus,
    source: c.assignedStudent.source || c.assignment_source || "AUTO",
  } : (c.assignedStudentName || c.usn ? {
    usn: c.usn || c.assignedUsn || "",
    name: c.assignedStudentName || c.name || c.usn || "",
    confidence: c.confidence || 0.85,
    status: identityStatus,
    source: c.assignment_source || "MANUAL",
  } : null);

  const candidateMatch = identityStatus === "CANDIDATE" ? {
    usn: c.assignedStudent?.usn || c.usn || "",
    name: c.assignedStudent?.name || c.name || c.usn || "Candidate",
    similarity: c.identity_mean_similarity || c.confidence || 0.65,
    votes: c.identity_vote_count || 2,
  } : null;

  const firstSeen = c.first_seen !== undefined ? `${Math.floor(c.first_seen / 60)}:${String(Math.floor(c.first_seen % 60)).padStart(2, '0')}` : (c.firstSeenTime || "00:00");
  const lastSeen = c.last_seen !== undefined ? `${Math.floor(c.last_seen / 60)}:${String(Math.floor(c.last_seen % 60)).padStart(2, '0')}` : (c.lastSeenTime || "00:00");

  return {
    id: c.id || cid,
    clusterId: cid,
    sessionId: c.sessionId || c.enrollmentSessionId || sessionId,
    clusterNumber: num,
    sampleCount: c.sampleCount ?? c.sample_count ?? samples.length ?? images.length ?? 0,
    trackCount: c.trackCount ?? c.track_count ?? c.tracks?.length ?? 1,
    qualityAvg: c.qualityAvg ?? c.quality_mean ?? 0.85,
    bestQualityScore: c.bestQualityScore ?? c.quality_max ?? 0.95,
    confidence: c.confidence ?? c.identity_mean_similarity ?? 0.85,
    firstSeenTime: firstSeen,
    lastSeenTime: lastSeen,
    firstSeenSec: c.first_seen,
    lastSeenSec: c.last_seen,
    identity_status: identityStatus,
    status,
    assignment_source: c.assignment_source || (assignedStudent?.source),
    assignedStudent,
    assignedStudentName: assignedStudent?.name || c.assignedStudentName,
    assignedUsn: assignedStudent?.usn || c.usn,
    candidateMatch,
    embeddingCount: c.embedding_count || c.sampleCount || images.length,
    purity: c.purity ?? c.internalPurity ?? 95,
    internalPurity: c.internalPurity ?? c.purity ?? 95,
    internal_min_similarity: c.internal_min_similarity ?? 90,
    internal_mean_similarity: c.internal_mean_similarity ?? 95,
    identity_evidence: c.identity_evidence || c.identityEvidence || "Moderate",
    identityEvidence: c.identityEvidence || c.identity_evidence || "Moderate",
    possible_multi_identity_cluster: Boolean(c.possible_multi_identity_cluster ?? c.possibleMultiIdentity),
    possibleMultiIdentity: Boolean(c.possibleMultiIdentity ?? c.possible_multi_identity_cluster),
    images,
    samples,
    gallery: c.gallery || [],
    bestImageUrl: bestImg,
    bestImagePath: c.bestImagePath || (images[0]?.imageUrl || null),
    isEnrolled: Boolean(c.isEnrolled || c.enrolled),
    enrolled: Boolean(c.isEnrolled || c.enrolled),
  };
}

/* ═══════════════════════════════════════════════════════════════════
   STATUS META
═══════════════════════════════════════════════════════════════════ */
const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING:          { label: "Pending",          dot: "bg-slate-400",               badge: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  PROCESSING:       { label: "Processing",       dot: "bg-blue-400 animate-pulse",  badge: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  REVIEW_REQUIRED:  { label: "Review Required",  dot: "bg-amber-400 animate-pulse", badge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  COMPLETED:        { label: "Completed",        dot: "bg-emerald-400",             badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  FAILED:           { label: "Failed",           dot: "bg-red-400",                 badge: "text-red-400 bg-red-500/10 border-red-500/30" },
  STOPPED:          { label: "Stopped",          dot: "bg-amber-400",               badge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  CANCELLED:        { label: "Cancelled",        dot: "bg-amber-400",               badge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  UNKNOWN:          { label: "Unknown",          dot: "bg-slate-400",               badge: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  CANDIDATE:        { label: "Candidate Match",  dot: "bg-amber-400 animate-pulse", badge: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  CONFIRMED:        { label: "Confirmed",        dot: "bg-emerald-400",             badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  REJECTED:         { label: "Rejected",         dot: "bg-red-400",                 badge: "text-red-400 bg-red-500/10 border-red-500/30" },
  UNASSIGNED:       { label: "Unassigned",       dot: "bg-slate-400",               badge: "text-slate-400 bg-slate-500/10 border-slate-500/30" },
  ASSIGNED:         { label: "Assigned",         dot: "bg-emerald-400",             badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
};

/* ═══════════════════════════════════════════════════════════════════
   FACE AVATAR — Biometric-style AI face placeholder
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

function ClusterFace({ cluster, size = 72 }: { cluster: Cluster; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgUrl = resolveCropUrl(cluster.bestImageUrl || cluster.bestImagePath || (cluster.gallery && cluster.gallery[0]));

  if (imgUrl && !imgFailed) {
    return (
      <img
        src={imgUrl}
        alt={`Cluster #${cluster.clusterNumber}`}
        onError={() => setImgFailed(true)}
        className="rounded-full object-cover border border-glass-border shadow-md"
        style={{ width: size, height: size }}
      />
    );
  }
  return <FaceAvatar id={cluster.clusterId || cluster.id} size={size} />;
}

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

function QualityRing({ score, size = 48 }: { score: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(score > 1 ? score : score * 100)));
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 85 ? "#10B981" : pct >= 70 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[9px] font-mono font-bold text-text-primary">{pct}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CREATE SESSION MODAL
═══════════════════════════════════════════════════════════════════ */
function CreateSessionModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Session) => void }) {
  const [name, setName] = useState("");
  const [dept, setDept] = useState("Computer Science & Engineering");
  const [prog, setProg] = useState("B.Tech CSE");
  const [sem, setSem] = useState("6th Semester");
  const [sec, setSec] = useState("Section A");
  const [sub, setSub] = useState("Machine Learning & Pattern Recognition");
  const [teach, setTeach] = useState("Dr. Ananya Sharma");
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Session name is required"); return; }
    if (videoFiles.length === 0) { setError("Please select at least one classroom video file (.mp4, .avi, .mkv)"); return; }

    setUploading(true);
    setError(null);

    try {
      const formPayload = {
        name: name.trim(),
        department: dept,
        program: prog,
        semester: sem,
        section: sec,
        subject: sub,
        teacher: teach,
        lectureDate: new Date().toISOString().split("T")[0],
        lectureTime: "09:00 - 10:30 AM",
      };

      const res = await authFetch(`${API_BASE}/enrollment/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create session");

      const session = data.data || data;
      const sessionId = session.id;

      const formData = new FormData();
      videoFiles.forEach((file) => formData.append("videos", file));

      const uploadRes = await authFetch(`${API_BASE}/enrollment/sessions/${sessionId}/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.message || "Failed to upload video files");

      const mapped = mapSession({ ...session, totalVideos: videoFiles.length });
      onCreated(mapped);
    } catch (err: any) {
      setError(err.message || "Error creating session");
    } finally {
      setUploading(false);
    }
  };

  const inputCls = "w-full bg-glass-light border border-glass-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-blue-500/50 placeholder:text-text-muted transition-all";
  const labelCls = "block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <motion.div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-xl bg-bg-secondary border border-glass-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        <div className="flex items-center justify-between px-6 py-5 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <Camera className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">New AI Face Enrollment Session</h2>
              <p className="text-[11px] text-text-muted">Upload multi-angle classroom footage for automatic identity clustering</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className={labelCls}>Session Title *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. CSE-6A Classroom Lecture — Morning Session"
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Department</label>
              <input value={dept} onChange={e => setDept(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Program</label>
              <input value={prog} onChange={e => setProg(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Semester</label>
              <input value={sem} onChange={e => setSem(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Section</label>
              <input value={sec} onChange={e => setSec(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Subject</label>
              <input value={sub} onChange={e => setSub(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teacher / Instructor</label>
              <input value={teach} onChange={e => setTeach(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Video Upload Area */}
          <div>
            <label className={labelCls}>Classroom Video Files (.mp4, .avi, .mkv) *</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  setVideoFiles(Array.from(e.target.files));
                }
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-glass-border hover:border-blue-500/40 rounded-xl p-6 text-center cursor-pointer transition-all bg-glass-light hover:bg-glass-medium group"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-text-muted group-hover:text-blue-400 transition-colors" />
              <p className="text-xs font-semibold text-text-primary">Click to select classroom video files</p>
              <p className="text-[10px] text-text-muted mt-1">Multi-angle CCTV / Camera recordings supported</p>
              {videoFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                  {videoFiles.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300">
                      <FileVideo className="w-3 h-3" /> {f.name} ({(f.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 py-2.5 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-secondary text-xs font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {uploading ? "Creating Session..." : "Create Enrollment Session"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STUDENT ASSIGNMENT MODAL (Real Database Search + 2-Step Confirmation)
═══════════════════════════════════════════════════════════════════ */
function AssignModal({ cluster, onClose, onDone }: { cluster: Cluster; onClose: () => void; onDone: (id: string, name: string) => void }) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentSearchResult[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<{
    name: string;
    usn: string;
    existingId?: string;
    department?: string;
    form?: any;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating a new student
  const [form, setForm] = useState({
    name: "",
    usn: "",
    dept: "Computer Science & Engineering",
    sem: "6",
    section: "A",
    email: "",
    phone: "",
  });

  // Debounced search querying real NestJS database endpoint: GET /api/students?search=...
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRealStudents = useCallback(async (query: string) => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({ limit: "25" });
      if (query.trim()) params.set("search", query.trim());

      const res = await authFetch(`${API_BASE}/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let studentList: StudentSearchResult[] = [];
        if (Array.isArray(data)) {
          studentList = data;
        } else if (Array.isArray(data.data)) {
          studentList = data.data;
        } else if (Array.isArray(data.data?.data)) {
          studentList = data.data.data;
        }
        setStudents(studentList);
      }
    } catch {
      /* transient fetch error fallback */
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "existing") {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchRealStudents(search);
      }, 250);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search, tab, fetchRealStudents]);

  const handleSelectExisting = (s: StudentSearchResult) => {
    setError(null);
    const usnVal = s.studentId || s.usn || s.rollNumber || "";
    setPendingStudent({
      name: s.fullName,
      usn: usnVal,
      existingId: s.id,
      department: typeof s.department === "object" ? s.department?.name : s.department,
    });
    setConfirmStep(true);
  };

  const handlePrepareNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.usn.trim()) {
      setError("Please provide both Full Name and USN/Student ID");
      return;
    }
    setError(null);
    setPendingStudent({
      name: form.name.trim(),
      usn: form.usn.trim(),
      department: form.dept,
      form,
    });
    setConfirmStep(true);
  };

  const executeAssignment = async () => {
    if (!pendingStudent) return;
    setSaving(true);
    setError(null);

    try {
      // 1. Call NestJS backend endpoint: POST /api/enrollment/clusters/assign-student
      const assignPayload: any = {
        clusterId: cluster.id,
        sessionId: cluster.sessionId,
        usn: pendingStudent.usn,
        fullName: pendingStudent.name,
        force: true,
      };
      if (pendingStudent.existingId) {
        assignPayload.existingStudentId = pendingStudent.existingId;
        assignPayload.section = "A";
        assignPayload.sectionId = "A";
      } else if (pendingStudent.form) {
        assignPayload.email = pendingStudent.form.email;
        assignPayload.phone = pendingStudent.form.phone;
        assignPayload.departmentId = pendingStudent.form.dept;
        assignPayload.semester = `${pendingStudent.form.sem}th Semester`;
        assignPayload.section = pendingStudent.form.section || "A";
        assignPayload.sectionId = pendingStudent.form.section || "A";
      }

      const res = await authFetch(`${API_BASE}/enrollment/clusters/assign-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignPayload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = Array.isArray(errJson.message) ? errJson.message.join(", ") : (errJson.message || `Server returned ${res.status}`);
        throw new Error(errMsg);
      }

      // 2. Call FastAPI AI Service endpoint: POST /api/v1/sessions/{sessionId}/clusters/{clusterId}/assign
      try {
        const aiCid = cluster.clusterId || cluster.id;
        await fetch(`${AI_BASE}/api/v1/sessions/${cluster.sessionId}/clusters/${aiCid}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usn: pendingStudent.usn,
            name: pendingStudent.name,
            studentId: pendingStudent.existingId,
            force: true,
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        /* best-effort AI sync */
      }

      onDone(cluster.id, pendingStudent.name);
    } catch (err: any) {
      setError(err.message || "Failed to assign student identity");
      setConfirmStep(false);
    } finally {
      setSaving(false);
    }
  };

  const isReassignment = cluster.identity_status === "CONFIRMED" || cluster.status === "ASSIGNED";
  const currentAssignedName = cluster.assignedStudentName || cluster.assignedStudent?.name;

  const inputCls = "w-full bg-glass-light border border-glass-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-muted transition-all";
  const labelCls = "block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <motion.div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-lg bg-bg-secondary border border-glass-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border shrink-0">
          <div className="flex items-center gap-3">
            <ClusterFace cluster={cluster} size={40} />
            <div>
              <h2 className="text-sm font-bold text-text-primary">Assign Student Identity</h2>
              <p className="text-[11px] text-text-muted">
                {cluster.clusterId || `Cluster #${cluster.clusterNumber}`} · {cluster.sampleCount} face crops · {Math.round(cluster.qualityAvg > 1 ? cluster.qualityAvg : cluster.qualityAvg * 100)}% quality
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        {/* Reassignment Warning */}
        {isReassignment && currentAssignedName && !confirmStep && (
          <div className="mx-6 mt-3 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Reassignment Notice:</span> This cluster is currently assigned to <strong className="text-white">{currentAssignedName}</strong>. Selecting a different student will update the verified identity.
            </div>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1">
          {confirmStep && pendingStudent ? (
            /* ── Step 2: 2-Step Confirmation Review ── */
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-xl bg-glass-light border border-glass-border space-y-3">
                <p className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Review & Confirm Assignment</p>
                <p className="text-xs text-text-secondary">
                  Link face biometric cluster <span className="font-mono text-blue-400 font-bold">{cluster.clusterId || `Cluster #${cluster.clusterNumber}`}</span> ({cluster.sampleCount} quality samples) to:
                </p>
                <div className="py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-400">{pendingStudent.name}</p>
                      <p className="text-xs font-mono text-text-muted mt-0.5">USN: {pendingStudent.usn}</p>
                      {pendingStudent.department && (
                        <p className="text-[11px] text-text-muted mt-0.5">{pendingStudent.department}</p>
                      )}
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>

                <div className="py-2.5 px-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-left text-[11px] text-blue-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold text-blue-200">Class Scoping & Clean Overwrite:</span> Assigned strictly to <strong className="text-white">Section A</strong>. Previous face profile templates and image samples for this student will be updated so only this new profile is saved.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-secondary text-xs font-semibold rounded-xl transition-all"
                >
                  Back to Search
                </button>
                <button
                  type="button"
                  onClick={executeAssignment}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? "Confirming..." : "Confirm & Save Assignment"}
                </button>
              </div>
            </div>
          ) : (
            /* ── Step 1: Student Search & Selection ── */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-glass-light border border-glass-border p-1">
                <button
                  type="button"
                  onClick={() => { setTab("existing"); setError(null); }}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                    tab === "existing" ? "bg-emerald-500/20 text-emerald-400 shadow-sm" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  Database Student Autocomplete
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("new"); setError(null); }}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                    tab === "new" ? "bg-emerald-500/20 text-emerald-400 shadow-sm" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  Create New Student
                </button>
              </div>

              {tab === "existing" ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Type student name, USN (e.g. 1VI23CS058), roll number..."
                      className="w-full bg-glass-light border border-glass-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-muted transition-all"
                      autoFocus
                    />
                    {loadingStudents && (
                      <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-emerald-400" />
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {students.map((s) => {
                      const usnVal = s.studentId || s.usn || s.rollNumber || "—";
                      const deptName = typeof s.department === "object" ? s.department?.name || s.department?.code : s.department;
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleSelectExisting(s)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-glass-light hover:bg-emerald-500/10 border border-glass-border hover:border-emerald-500/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                              {s.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-text-primary group-hover:text-emerald-300 truncate">{s.fullName}</p>
                              <p className="text-[10px] font-mono text-text-muted">{usnVal} {deptName ? `· ${deptName}` : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(() => {
                              const isSecA = s.section === "A" || /^1VI23CS0(0[1-9]|[1-5][0-9]|6[0-4])$/i.test(usnVal);
                              return (
                                <span className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded-md border",
                                  isSecA
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                )}>
                                  {isSecA ? "Sec A" : "Sec B"}
                                </span>
                              );
                            })()}
                            {s.faceEnrolled && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Enrolled
                              </span>
                            )}
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/80 group-hover:bg-emerald-500 text-white text-[11px] font-semibold transition-all shadow-sm"
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {!loadingStudents && students.length === 0 && (
                      <div className="text-center py-8 text-text-muted text-xs">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>No matching students found.</p>
                        <p className="text-[10px] mt-1">Try another search query or switch to "Create New Student".</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePrepareNew} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Full Name *</label>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Manjunatha R"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelCls}>USN / Student ID *</label>
                      <input
                        value={form.usn}
                        onChange={e => setForm(f => ({ ...f, usn: e.target.value }))}
                        placeholder="e.g. 1VI23CS058"
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Department</label>
                      <select
                        value={form.dept}
                        onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}
                        className={inputCls}
                      >
                        {["Computer Science & Engineering", "Information Science", "Electronics & Comm.", "Mechanical", "Civil", "AI & ML"].map(d => (
                          <option key={d} value={d} className="bg-bg-secondary text-text-primary">{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Semester</label>
                      <select
                        value={form.sem}
                        onChange={e => setForm(f => ({ ...f, sem: e.target.value }))}
                        className={inputCls}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <option key={s} value={String(s)} className="bg-bg-secondary text-text-primary">{s}th Sem</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Section</label>
                      <select
                        value={form.section}
                        onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                        className={inputCls}
                      >
                        {["A", "B", "C", "D"].map(s => (
                          <option key={s} value={s} className="bg-bg-secondary text-text-primary">Section {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Email (Optional)</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="student@college.edu"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Phone (Optional)</label>
                      <input
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 9876543210"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] mt-2"
                  >
                    Continue to Confirmation <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EXPLICIT FAISS ENROLLMENT MODAL (2-Step Safety Verification)
═══════════════════════════════════════════════════════════════════ */
function EnrollModal({ cluster, activeSessionId, onClose, onEnrolled }: { cluster: Cluster; activeSessionId?: string | null; onClose: () => void; onEnrolled: (cid: string) => void }) {
  const [enrolling, setEnrolling] = useState(false);
  const [enrolledSuccess, setEnrolledSuccess] = useState(false);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const studentName = cluster.assignedStudentName || cluster.assignedStudent?.name || cluster.assignedStudent?.studentId || "Student";
  const studentUsn = cluster.assignedUsn || cluster.assignedStudent?.usn || (cluster as any).usn || (cluster.assignedStudent as any)?.studentId || "";
  const sId = cluster.sessionId || (cluster as any).enrollmentSessionId || activeSessionId || "408";

  const handleEnroll = async () => {
    setEnrolling(true);
    setError(null);
    try {
      const targetSid = sId || cluster.sessionId || (cluster as any).enrollmentSessionId || activeSessionId || "408";
      const clusterKey = cluster.clusterId || cluster.id;
      const targetUsn = (studentUsn && studentUsn !== "USN") ? studentUsn : (cluster.assignedUsn || cluster.assignedStudent?.usn || (cluster as any).usn || studentName);

      if (!targetUsn || targetUsn === "USN") {
        throw new Error("Cannot enroll: Student identity must be assigned to this cluster first.");
      }

      // 1. Register 512D ArcFace vectors into FAISS via AI service
      const res = await fetch(`${AI_BASE}/api/v1/sessions/${targetSid}/enroll-cluster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usn: targetUsn,
          clusterId: clusterKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "Biometric registration failed");

      const count = data.addedVectors || cluster.sampleCount || 1;
      const photoPath = cluster.bestImagePath || cluster.bestImageUrl || (cluster.gallery && cluster.gallery[0]) || null;

      // 2. Direct Sync into Postgres Student Record
      try {
        await authFetch(`${API_BASE}/students/sync-enrollment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usn: targetUsn,
            studentId: cluster.assignedStudent?.studentId || (cluster as any).student_id,
            faceSamples: count,
            profilePhoto: photoPath,
          }),
        });
      } catch (dbErr) {
        console.warn("Direct student sync fallback error:", dbErr);
      }

      // 3. Direct Sync of Session Clusters in Postgres
      try {
        await authFetch(`${API_BASE}/enrollment/sessions/${targetSid}/sync-clusters`, {
          method: "POST",
        });
      } catch (syncErr) {
        console.warn("Session cluster sync error:", syncErr);
      }

      setAddedCount(count);
      setEnrolledSuccess(true);
      onEnrolled(cluster.id);
    } catch (err: any) {
      setError(err.message || "Failed to register biometric template in directory");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <motion.div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-md bg-bg-secondary border border-purple-500/40 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.25)] overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/80 to-transparent" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Fingerprint className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Biometric Directory Registration</h2>
              <p className="text-[10px] text-text-muted">{cluster.clusterId || `Cluster #${cluster.clusterNumber}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        {enrolledSuccess ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-400">Biometric Profile Enrolled Successfully</h3>
              <p className="text-xs text-text-muted mt-1">
                {addedCount} biometric facial sample templates registered in the campus directory for <strong>{studentName}</strong> (<code>{studentUsn}</code>).
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4 text-center">
            <div className="flex justify-center">
              <ClusterFace cluster={cluster} size={80} />
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted uppercase font-semibold">Student Identity</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CONFIRMED</span>
              </div>
              <p className="text-sm font-bold text-text-primary">{studentName}</p>
              <p className="text-xs font-mono text-purple-300">USN: {studentUsn}</p>
              <div className="border-t border-purple-500/20 pt-2 text-[11px] text-text-muted flex justify-between">
                <span>Verified Facial Samples:</span>
                <span className="font-mono text-purple-300 font-bold">{cluster.sampleCount} samples</span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed text-left">
              This will register the verified facial biometric profile into the campus directory for automated classroom roll call.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={enrolling}
                className="flex-1 py-2.5 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-secondary text-xs font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)]"
              >
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                {enrolling ? "Enrolling Vectors..." : "Enroll Face Data"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CLUSTER DETAILS / GALLERY MODAL
═══════════════════════════════════════════════════════════════════ */
function ClusterDetailsModal({ cluster, onClose, onDelete }: { cluster: Cluster; onClose: () => void; onDelete?: (c: Cluster) => void }) {
  const [active, setActive] = useState(0);
  const images = cluster.images.length > 0 ? cluster.images : (cluster.gallery || []).map((g, i) => ({
    id: `${cluster.id}-g-${i}`,
    frameNumber: i,
    videoFileName: "classroom.mp4",
    timestampSec: i * 2,
    qualityScore: 0.88,
    isBest: i === 0,
    imageUrl: resolveCropUrl(g),
  }));
  const activeImg = images[active];
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => { setImgFailed(false); }, [active]);

  const studentName = cluster.assignedStudentName || cluster.assignedStudent?.name;
  const studentUsn = cluster.assignedUsn || cluster.assignedStudent?.usn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <motion.div className="absolute inset-0 bg-bg-primary/90 backdrop-blur-2xl" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-5xl max-h-[88vh] h-[82vh] bg-bg-secondary border border-glass-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border shrink-0">
          <div className="flex items-center gap-3">
            <ClusterFace cluster={cluster} size={38} />
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                {cluster.clusterId || `Cluster #${cluster.clusterNumber}`} — Identity Details &amp; Crops
              </h2>
              <p className="text-[11px] text-text-muted">
                {images.length} quality crops · {cluster.sampleCount} detections · {Math.round((cluster.qualityAvg > 1 ? cluster.qualityAvg : cluster.qualityAvg * 100))}% avg quality
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(cluster);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-all cursor-pointer"
                title="Delete this cluster"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Cluster</span>
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Face Preview */}
          <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary/40 relative p-8">
            <div className="relative">
              <div className="w-56 h-56 rounded-2xl bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-glass-border flex items-center justify-center relative overflow-hidden shadow-2xl">
                {activeImg?.imageUrl && !imgFailed ? (
                  <img
                    src={activeImg.imageUrl}
                    alt={`Crop #${activeImg.frameNumber}`}
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FaceAvatar id={`${cluster.clusterId || cluster.id}-${active}`} size={160} />
                )}
                {activeImg?.isBest && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-2 py-1">
                    <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                    <span className="text-[9px] text-yellow-400 font-bold">REPRESENTATIVE MEDOID</span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-bg-tertiary border border-glass-border rounded-full px-3 py-1 flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", (activeImg?.qualityScore || 0.85) >= 0.85 ? "bg-emerald-400" : "bg-yellow-400")} />
                <span className="text-[10px] font-mono text-text-primary">
                  {Math.round((activeImg?.qualityScore || 0.85) > 1 ? (activeImg?.qualityScore || 85) : (activeImg?.qualityScore || 0.85) * 100)}% quality
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-md">
              {[
                { label: "Sample #", value: `${active + 1} of ${images.length}` },
                { label: "Track ID", value: `Track #${cluster.trackCount}` },
                { label: "Consistency", value: `${Math.round(cluster.confidence * 100)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-2.5 rounded-xl bg-glass-light border border-glass-border">
                  <p className="text-xs font-semibold text-text-primary">{value}</p>
                  <p className="text-[9px] text-text-muted mt-0.5 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>

            {studentName && (
              <div className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <p className="text-xs font-bold text-emerald-400">{studentName}</p>
                <p className="text-[10px] font-mono text-text-muted mt-0.5">{studentUsn}</p>
              </div>
            )}
          </div>

          {/* Gallery Filmstrip */}
          <div className="w-64 border-l border-glass-border flex flex-col bg-bg-primary/20 shrink-0">
            <div className="px-4 py-3 border-b border-glass-border shrink-0">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Captured Face Samples</p>
              <p className="text-[9px] text-text-muted mt-0.5">{images.length} representative crops</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {images.length === 0 && (
                <p className="text-xs text-text-muted text-center mt-4">No crops stored</p>
              )}
              {images.map((im, i) => (
                <button
                  key={im.id || i}
                  onClick={() => setActive(i)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left",
                    active === i ? "bg-blue-500/15 border-blue-500/40 shadow-sm" : "bg-glass-light border-glass-border hover:bg-glass-medium"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden",
                    active === i ? "bg-blue-500/20 border-blue-500/30" : "bg-glass-light border-glass-border"
                  )}>
                    {im.imageUrl ? (
                      <img src={im.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <ScanFace className={cn("w-4 h-4", active === i ? "text-blue-400" : "text-text-muted")} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">Crop #{i + 1}</p>
                    <p className="text-[9px] font-mono text-text-muted">
                      {Math.round((im.qualityScore || 0.85) > 1 ? im.qualityScore : (im.qualityScore || 0.85) * 100)}% quality
                    </p>
                  </div>
                  {im.isBest && <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" fill="currentColor" />}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-glass-border space-y-2 shrink-0 font-mono text-[10px]">
              <div className="flex justify-between"><span className="text-text-muted">First Seen:</span><span className="text-text-primary">{cluster.firstSeenTime}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Last Seen:</span><span className="text-text-primary">{cluster.lastSeenTime}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Tracks:</span><span className="text-blue-400">{cluster.trackCount}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Detections:</span><span className="text-emerald-400">{cluster.sampleCount}</span></div>
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
function ClusterCard({
  c,
  onAssign,
  onConfirmCandidate,
  onReject,
  onEnroll,
  onDetails,
  onDelete,
}: {
  c: Cluster;
  onAssign: (c: Cluster) => void;
  onConfirmCandidate: (c: Cluster) => void;
  onReject: (id: string) => void;
  onEnroll: (c: Cluster) => void;
  onDetails: (c: Cluster) => void;
  onDelete: (c: Cluster) => void;
}) {
  const isCandidate = c.identity_status === "CANDIDATE";
  const isConfirmed = c.identity_status === "CONFIRMED" || c.status === "ASSIGNED";
  const isRejected = c.identity_status === "REJECTED" || c.status === "REJECTED";
  const isUnknown = !isCandidate && !isConfirmed && !isRejected;

  const sm = STATUS_META[c.identity_status] || STATUS_META[c.status] || STATUS_META.UNKNOWN;
  const q = c.qualityAvg > 1 ? c.qualityAvg / 100 : c.qualityAvg;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all duration-200 group flex flex-col justify-between",
        isConfirmed ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.08)]" :
        isCandidate ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.08)]" :
        isRejected ? "border-red-500/20 bg-red-500/5 opacity-60" :
        "border-glass-border bg-glass-light hover:border-blue-500/30 hover:bg-blue-500/5"
      )}
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-blue-500/40 transition-all duration-500" />

      {/* Header with Cluster ID & Status Badge */}
      <div className="pt-4 px-4 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold text-text-primary">
              {c.clusterId || `Cluster #${c.clusterNumber}`}
            </span>
            <span className="text-[10px] font-medium text-text-muted">Identity Candidate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider", sm.badge)}>
              <div className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />
              {isCandidate && c.candidateMatch ? `${Math.round(c.candidateMatch.similarity * 100)}% MATCH` : sm.label}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c);
              }}
              className="p-1 rounded-lg bg-glass-light hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
              title="Delete this cluster"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Central Face Crop & Quality Ring */}
        <div className="flex flex-col items-center gap-2.5 my-2">
          <div className="relative">
            <ClusterFace cluster={c} size={68} />
            <div className="absolute -bottom-1 -right-1">
              <QualityRing score={q} size={30} />
            </div>
          </div>

          {/* Mini face crops thumbnail row */}
          {c.gallery && Array.isArray(c.gallery) && c.gallery.length > 1 && (
            <div className="flex items-center gap-1 mt-0.5">
              {c.gallery.slice(1, 4).map((gItem, i) => {
                const srcUrl = resolveCropUrl(gItem);
                if (!srcUrl) return null;
                return (
                  <img
                    key={i}
                    src={srcUrl}
                    alt=""
                    className="w-6 h-6 rounded-md object-cover border border-glass-border opacity-70 hover:opacity-100 transition-opacity"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                );
              })}
              {c.gallery.length > 4 && (
                <span className="text-[9px] font-mono text-text-muted px-1">+{c.gallery.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Biometric Metadata Stats Row */}
      <div className="grid grid-cols-3 divide-x divide-glass-border border-y border-glass-border text-center bg-black/10">
        <div className="py-2">
          <p className="text-xs font-bold text-blue-400">{c.sampleCount}</p>
          <p className="text-[9px] text-text-muted uppercase tracking-wider">Samples</p>
        </div>
        <div className="py-2">
          <p className="text-xs font-bold text-yellow-400">{c.trackCount}</p>
          <p className="text-[9px] text-text-muted uppercase tracking-wider">Tracks</p>
        </div>
        <div className="py-2">
          <p className={cn("text-xs font-bold", q >= 0.85 ? "text-emerald-400" : "text-amber-400")}>
            {Math.round(q * 100)}%
          </p>
          <p className="text-[9px] text-text-muted uppercase tracking-wider">Quality</p>
        </div>
      </div>

      {/* Frame & Time Span */}
      <div className="px-4 py-2 flex items-center justify-between text-[10px] font-mono text-text-muted border-b border-glass-border bg-black/5">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.firstSeenTime}</span>
        <div className="flex-1 mx-2 border-t border-dashed border-glass-border" />
        <span>{c.lastSeenTime}</span>
      </div>

      {/* Identity Evidence & Cluster Purity Row */}
      <div className="px-3 py-1.5 bg-black/20 border-b border-glass-border flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Evidence:</span>
          <span className={cn(
            "font-semibold px-1.5 py-0.5 rounded text-[9px]",
            (c.identityEvidence || c.identity_evidence) === "Strong" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
            (c.identityEvidence || c.identity_evidence) === "Moderate" ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" :
            "bg-slate-500/15 text-slate-400 border border-slate-500/30"
          )}>
            {c.identityEvidence || c.identity_evidence || "Moderate"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Purity:</span>
          <span className="font-mono font-bold text-text-secondary">{c.internalPurity || c.purity || 95}%</span>
          {c.possibleMultiIdentity ? (
            <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-1 py-0.5 rounded text-[8px] font-bold animate-pulse">
              MULTI-ID: YES
            </span>
          ) : (
            <span className="text-text-muted text-[8px]">MULTI: NO</span>
          )}
        </div>
      </div>

      {/* Identity State Section */}
      <div className="p-3 space-y-2.5">
        {isConfirmed && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Confirmed Student</span>
              <span className="text-[9px] font-mono text-emerald-400/80">{c.assignment_source || "MANUAL"}</span>
            </div>
            <p className="text-xs font-bold text-text-primary truncate">{c.assignedStudentName || c.assignedStudent?.name}</p>
            <p className="text-[10px] font-mono text-emerald-400/90 truncate">{c.assignedUsn || c.assignedStudent?.usn}</p>
          </div>
        )}

        {isCandidate && c.candidateMatch && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Candidate Match</span>
              <span className="text-[9px] font-mono text-amber-400">{Math.round(c.candidateMatch.similarity * 100)}% Sim</span>
            </div>
            <p className="text-xs font-bold text-text-primary truncate">{c.candidateMatch.name}</p>
            <p className="text-[10px] font-mono text-text-muted truncate">{c.candidateMatch.usn}</p>
          </div>
        )}

        {isUnknown && (
          <div className="p-2.5 rounded-xl bg-glass-light border border-glass-border text-center">
            <p className="text-xs font-semibold text-text-secondary">Unidentified Face Profile</p>
            <p className="text-[10px] text-text-muted mt-0.5">No database match found</p>
          </div>
        )}

        {isRejected && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-center">
            <p className="text-xs font-semibold text-red-400">Cluster Excluded</p>
            <p className="text-[10px] text-text-muted mt-0.5">Rejected from attendance recognition</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-1.5 pt-1">
          {isUnknown && (
            <>
              <button
                onClick={() => onAssign(c)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_16px_rgba(59,130,246,0.25)]"
              >
                <UserPlus className="w-3.5 h-3.5" /> Assign Student
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onDetails(c)}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-muted hover:text-text-primary rounded-xl text-[11px] font-medium transition-all"
                >
                  <Eye className="w-3 h-3" /> View Details
                </button>
                <button
                  onClick={() => onReject(c.id)}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-glass-light hover:bg-red-500/10 border border-glass-border hover:border-red-500/30 text-text-muted hover:text-red-400 rounded-xl text-[11px] font-medium transition-all"
                >
                  <XCircle className="w-3 h-3" /> Reject
                </button>
              </div>
            </>
          )}

          {isCandidate && (
            <>
              <button
                onClick={() => onConfirmCandidate(c)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_16px_rgba(16,185,129,0.3)]"
              >
                <Check className="w-3.5 h-3.5" /> Confirm Match
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onAssign(c)}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-glass-light hover:bg-blue-500/10 border border-glass-border hover:border-blue-500/30 text-text-muted hover:text-blue-400 rounded-xl text-[11px] font-medium transition-all"
                >
                  <UserPlus className="w-3 h-3" /> Assign Other
                </button>
                <button
                  onClick={() => onReject(c.id)}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-glass-light hover:bg-red-500/10 border border-glass-border hover:border-red-500/30 text-text-muted hover:text-red-400 rounded-xl text-[11px] font-medium transition-all"
                >
                  <XCircle className="w-3 h-3" /> Reject
                </button>
              </div>
            </>
          )}

          {isConfirmed && (
            <>
              {(c.isEnrolled || c.enrolled) ? (
                <div className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Enrolled ({c.sampleCount} samples)</span>
                </div>
              ) : (
                <button
                  onClick={() => onEnroll(c)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                >
                  <Fingerprint className="w-3.5 h-3.5" /> Enroll Face Data
                </button>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onDetails(c)}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-muted hover:text-text-primary rounded-xl text-[11px] font-medium transition-all"
                >
                  <Eye className="w-3 h-3" /> Details
                </button>
                <button
                  onClick={() => onAssign(c)}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-glass-light hover:bg-amber-500/10 border border-glass-border hover:border-amber-500/30 text-text-muted hover:text-amber-400 rounded-xl text-[11px] font-medium transition-all"
                >
                  <RotateCcw className="w-3 h-3" /> Reassign
                </button>
              </div>
            </>
          )}

          {isRejected && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onAssign(c)}
                className="flex items-center justify-center gap-1.5 py-2 bg-glass-light hover:bg-emerald-500/10 border border-glass-border hover:border-emerald-500/30 text-text-muted hover:text-emerald-400 rounded-xl text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3 h-3" /> Reassign
              </button>
              <button
                onClick={() => onDetails(c)}
                className="flex items-center justify-center gap-1.5 py-2 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-muted hover:text-text-primary rounded-xl text-xs font-semibold transition-all"
              >
                <Eye className="w-3 h-3" /> Details
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SESSION ITEM
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
               : "bg-glass-light border-glass-border hover:bg-glass-medium hover:border-glass-border"
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
  const [filterTab, setFilterTab] = useState<"ALL" | "PENDING" | "CONFIRMED" | "CANDIDATE" | "UNKNOWN" | "REJECTED">("ALL");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Cluster | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<Cluster | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Cluster | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  const [selectedDetector, setSelectedDetector] = useState<string>("yolo26");
  const wsRef = useRef<WebSocket | null>(null);

  const pushToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  /* ── Load Sessions ── */
  const loadSessions = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/enrollment/sessions`);
      const data = await res.json();
      const rawList: Session[] = (data.data || data || []).map(mapSession);
      const list = Array.from(new Map(rawList.map(s => [s.id, s])).values());
      setSessions(list);
      if (list.length > 0 && !activeId) {
        setActiveId(list[0].id);
      }
    } catch {
      /* API fallback */
    } finally {
      setLoadingSessions(false);
    }
  }, [activeId]);

  useEffect(() => { loadSessions(); }, []);

  /* ── Load Clusters for Active Session ── */
  const loadClusters = useCallback(async (sessionId: string, silent = false) => {
    if (!silent) setLoadingClusters(true);
    try {
      // 1. Check AI service cluster list first for full real-time pipeline analytics
      let aiList: any[] = [];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const aiRes = await fetch(`${AI_BASE}/api/v1/sessions/${sessionId}/clusters`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          aiList = Array.isArray(aiData.clusters) ? aiData.clusters : [];
        }
      } catch {}

      // 2. Check NestJS database clusters
      let dbList: any[] = [];
      try {
        const res = await authFetch(`${API_BASE}/enrollment/sessions/${sessionId}/clusters`);
        if (res.ok) {
          const data = await res.json();
          dbList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        }
      } catch {}

      // Merge AI list with DB list so assignments and enrollment flags from both sources are preserved
      let mergedList: any[] = [];
      if (aiList.length > 0) {
        mergedList = aiList.map((ac: any) => {
          const dbMatch = dbList.find((dc: any) => 
            (dc.clusterNumber && ac.clusterNumber && dc.clusterNumber === ac.clusterNumber) ||
            dc.id === ac.id || dc.clusterId === ac.clusterId
          );
          if (dbMatch) {
            const isEnr = Boolean(ac.isEnrolled || ac.enrolled || dbMatch.isEnrolled);
            return {
              ...dbMatch,
              ...ac,
              isEnrolled: isEnr,
              enrolled: isEnr,
              assignedStudent: ac.assignedStudent || (dbMatch.assignedStudentName ? {
                name: dbMatch.assignedStudentName,
                usn: dbMatch.assignedStudentUsn || dbMatch.assignedUsn,
                status: "CONFIRMED"
              } : null),
              assignedStudentName: ac.assignedStudentName || dbMatch.assignedStudentName,
              assignedUsn: ac.assignedUsn || dbMatch.assignedUsn,
              identity_status: (isEnr || ac.identity_status === "CONFIRMED" || dbMatch.status === "ASSIGNED") ? "CONFIRMED" : (ac.identity_status || dbMatch.status || "UNKNOWN"),
              status: (isEnr || ac.status === "ASSIGNED" || dbMatch.status === "ASSIGNED") ? "ASSIGNED" : (ac.status || "UNASSIGNED"),
            };
          }
          return ac;
        });
      } else {
        mergedList = dbList;
      }

      const rawList: Cluster[] = mergedList.map((c: any) => {
        try {
          return mapCluster(c, sessionId);
        } catch {
          return null;
        }
      }).filter(Boolean) as Cluster[];

      const list = Array.from(new Map(rawList.map(c => [c.id, c])).values());

      setClusters(prev => {
        const other = prev.filter(c => c.sessionId !== sessionId);
        const combined = [...other, ...list];
        return Array.from(new Map(combined.map(c => [c.id, c])).values());
      });
    } catch {
      /* ignore */
    } finally {
      if (!silent) setLoadingClusters(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) loadClusters(activeId);
  }, [activeId, loadClusters]);

  const sessionsRef = useRef(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  /* ── Auto-Refresh for Active Processing Sessions ── */
  useEffect(() => {
    const interval = setInterval(async () => {
      const isProcessing = sessionsRef.current.some(s => s.status === "PROCESSING");
      if (!isProcessing) return;

      try {
        const res = await authFetch(`${API_BASE}/enrollment/sessions`);
        if (!res.ok) return;
        const data = await res.json();
        const rawList: Session[] = (data.data || data || []).map(mapSession);
        const list = Array.from(new Map(rawList.map(s => [s.id, s])).values());

        const prev = sessionsRef.current;
        list.forEach(newS => {
          const oldS = prev.find(p => p.id === newS.id);
          if (oldS && oldS.status === "PROCESSING" && (newS.status === "REVIEW_REQUIRED" || newS.status === "COMPLETED")) {
            authFetch(`${API_BASE}/enrollment/sessions/${newS.id}/sync-clusters`, { method: "POST" })
              .then(() => loadClusters(newS.id, true));
            pushToast(`✅ AI processing complete for session "${newS.name}"!`);
          }
        });

        setSessions(list);

        if (activeId && list.some(s => s.id === activeId && s.status === "PROCESSING")) {
          loadClusters(activeId, true);
        }
      } catch {
        /* transient fetch error */
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeId, loadClusters]);

  /* ── WebSocket Connection ── */
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
              qualitySamples: msg.qualitySamples ?? msg.diagnostics?.quality_samples ?? s.qualitySamples,
              arcfaceEmbeddings: msg.arcfaceEmbeddings ?? msg.diagnostics?.arcface_embeddings ?? s.arcfaceEmbeddings,
              activeTracks: msg.activeTracks ?? msg.diagnostics?.active_tracks ?? s.activeTracks,
              totalTracks: msg.totalTracks ?? msg.diagnostics?.total_tracks ?? s.totalTracks,
              processingFps: msg.processingFps ?? msg.diagnostics?.processing_fps ?? s.processingFps,
              generatedClusters: msg.generatedClusters ?? msg.clusters?.length ?? s.generatedClusters,
            } : s));

            if (msg.clusters && Array.isArray(msg.clusters) && msg.clusters.length > 0) {
              const liveList: Cluster[] = msg.clusters.map((c: any) => mapCluster(c, sessionId));
              setClusters(prev => {
                const other = prev.filter(c => c.sessionId !== sessionId);
                const combined = [...other, ...liveList];
                return Array.from(new Map(combined.map(c => [c.id, c])).values());
              });
            }
          }
          if (msg.event === "ENROLLMENT_COMPLETED") {
            authFetch(`${API_BASE}/enrollment/sessions/${sessionId}/sync-clusters`, { method: "POST" })
              .then(() => loadClusters(sessionId))
              .then(() => loadSessions());
            setSessions(prev => prev.map(s => s.id === sessionId ? {
              ...s, status: "REVIEW_REQUIRED", progressPercentage: 100,
              generatedClusters: msg.totalClusters || s.generatedClusters,
            } : s));
            pushToast(`✅ AI processing complete! ${msg.totalClusters || 0} clusters generated. Review and assign below.`);
            ws.close();
          }
        } catch { /* bad JSON */ }
      };

      ws.onerror = () => {
        pollProgress(sessionId);
      };
    } catch {
      pollProgress(sessionId);
    }
  }, [loadClusters, loadSessions]);

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
          if (session.status === "REVIEW_REQUIRED" || session.status === "COMPLETED") {
            await loadClusters(sessionId);
            pushToast("✅ Processing complete! Identity clusters ready for review.");
          }
        }
      } catch { /* ignore */ }
      if (attempts > 120) clearInterval(interval);
    }, 4000);
    return () => clearInterval(interval);
  }, [loadClusters]);

  /* ── Action Handlers ── */
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
      pushToast("🚀 AI pipeline started! Processing classroom video frames...");
      connectWs(activeId);
    } catch (err: any) {
      setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "PENDING" } : s));
      pushToast(`❌ ${err.message || "Could not start processing. Is the AI service running?"}`);
    } finally {
      setProcessingSessionId(null);
    }
  }, [activeId, connectWs, selectedDetector]);

  const handleStopProcessing = useCallback(async (sessionId: string) => {
    try {
      pushToast("⏳ Finalizing session detections and processing student identities...");
      const res = await authFetch(`${API_BASE}/enrollment/sessions/${sessionId}/stop`, { method: "POST" });
      if (res.ok) {
        await loadClusters(sessionId);
        await loadSessions();
        pushToast("✅ Detections finalized & identity clusters ready for review!");
      } else {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: "STOPPED" } : s));
        pushToast("🛑 AI processing stopped.");
      }
    } catch {
      pushToast("❌ Failed to stop processing.");
    }
  }, [loadClusters, loadSessions]);

  const handleReclusterSession = useCallback(async (sessionId: string) => {
    try {
      pushToast("🔄 Analyzing facial features and grouping student tracks...");
      await fetch(`${AI_BASE}/api/v1/sessions/${sessionId}/cluster-tracks`, { method: "POST" });
      await authFetch(`${API_BASE}/enrollment/sessions/${sessionId}/sync-clusters`, { method: "POST" });
      await loadClusters(sessionId);
      await loadSessions();
      pushToast("✅ Identity clusters generated successfully!");
    } catch (err: any) {
      pushToast(`❌ Failed to cluster tracks: ${err.message}`);
    }
  }, [loadClusters, loadSessions]);

  const handleDeleteCluster = useCallback(async (cluster: Cluster) => {
    const cid = cluster.clusterId || cluster.id;
    const sId = cluster.sessionId || activeId;
    if (!confirm(`Are you sure you want to delete Cluster #${cluster.clusterNumber || cid}? This will remove it from the identity candidate pool.`)) {
      return;
    }
    try {
      pushToast(`🗑️ Deleting Cluster #${cluster.clusterNumber}...`);
      if (sId) {
        try {
          await fetch(`${AI_BASE}/api/v1/sessions/${sId}/clusters/${cid}`, { method: "DELETE" });
        } catch {}
      }
      if (cluster.id) {
        try {
          await authFetch(`${API_BASE}/enrollment/clusters/${cluster.id}`, { method: "DELETE" });
        } catch {}
      }
      setClusters(prev => prev.filter(c => c.id !== cluster.id && c.clusterId !== cid));
      pushToast(`🗑️ Cluster #${cluster.clusterNumber} deleted.`);
    } catch (err: any) {
      pushToast(`❌ Failed to delete cluster: ${err.message}`);
    }
  }, [activeId]);

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

  const handleFinalize = useCallback(async () => {
    if (!activeId) return;
    try {
      await authFetch(`${API_BASE}/enrollment/sessions/${activeId}/finalize`, { method: "POST" });
      setSessions(prev => prev.map(s => s.id === activeId ? { ...s, status: "COMPLETED" } : s));
      pushToast("🎉 Session finalized. All verified biometric profiles stored.");
    } catch {
      pushToast("❌ Failed to finalize session.");
    }
  }, [activeId]);

  const handleAssigned = useCallback((clusterId: string, name: string) => {
    setClusters(prev => prev.map(c => c.id === clusterId ? {
      ...c,
      identity_status: "CONFIRMED",
      status: "ASSIGNED",
      assignment_source: "MANUAL",
      assignedStudentName: name,
      assignedStudent: {
        usn: c.assignedUsn || "",
        name,
        confidence: 1.0,
        status: "CONFIRMED",
        source: "MANUAL",
      }
    } : c));
    setAssignTarget(null);
    pushToast(`✅ "${name}" identity assigned! Click [ Enroll Face Data ] to save biometric profile.`);
  }, []);

  const handleConfirmCandidate = useCallback(async (cluster: Cluster) => {
    try {
      const aiCid = cluster.clusterId || cluster.id;
      await fetch(`${AI_BASE}/api/v1/sessions/${cluster.sessionId}/clusters/${aiCid}/confirm`, {
        method: "POST",
      });

      setClusters(prev => prev.map(c => c.id === cluster.id ? {
        ...c,
        identity_status: "CONFIRMED",
        status: "ASSIGNED",
        assignment_source: "AUTOMATIC",
        assignedStudent: {
          ...(c.assignedStudent || { usn: c.candidateMatch?.usn || "", name: c.candidateMatch?.name || "" }),
          status: "CONFIRMED",
        }
      } : c));

      pushToast(`✅ Match confirmed for "${cluster.candidateMatch?.name || 'Student'}"!`);
    } catch {
      pushToast("❌ Failed to confirm candidate match.");
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    setClusters(prev => prev.map(c => c.id === id ? {
      ...c,
      identity_status: "REJECTED",
      status: "REJECTED",
      assignedStudent: null,
      assignedStudentName: undefined,
    } : c));
    pushToast("Cluster rejected and excluded from biometric recognition.");
    try {
      const targetCluster = clusters.find(c => c.id === id);
      const aiCid = targetCluster?.clusterId || id;
      if (activeId) {
        await fetch(`${AI_BASE}/api/v1/sessions/${activeId}/clusters/${aiCid}/reject`, { method: "POST" });
      }
    } catch { /* best-effort */ }
  }, [clusters, activeId]);

  const handleEnrolled = useCallback((clusterId: string) => {
    setClusters(prev => prev.map(c => (c.id === clusterId || c.clusterId === clusterId) ? {
      ...c,
      isEnrolled: true,
      enrolled: true,
      identity_status: "CONFIRMED",
      status: "ASSIGNED",
    } : c));
    pushToast("🎉 Student biometric profile successfully registered in the campus directory!");
  }, []);

  const handleCreated = useCallback((s: Session) => {
    setSessions(prev => {
      const filtered = prev.filter(item => item.id !== s.id);
      return [s, ...filtered];
    });
    setActiveId(s.id);
    setShowCreate(false);
    pushToast(`🎬 Session "${s.name}" created. Click Start AI Processing when ready.`);
  }, []);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  const active = sessions.find(s => s.id === activeId);

  const sessionClusters = useMemo(() => {
    const matched = clusters.filter(c => c.sessionId === activeId);
    return Array.from(new Map(matched.map(c => [c.id, c])).values());
  }, [clusters, activeId]);

  const counts = useMemo(() => {
    return {
      all: sessionClusters.length,
      pending: sessionClusters.filter(c => c.identity_status === "UNKNOWN" || c.identity_status === "CANDIDATE" || c.status === "UNASSIGNED").length,
      confirmed: sessionClusters.filter(c => c.identity_status === "CONFIRMED" || c.status === "ASSIGNED").length,
      candidate: sessionClusters.filter(c => c.identity_status === "CANDIDATE").length,
      unknown: sessionClusters.filter(c => c.identity_status === "UNKNOWN" || (c.status === "UNASSIGNED" && c.identity_status !== "CANDIDATE")).length,
      rejected: sessionClusters.filter(c => c.identity_status === "REJECTED" || c.status === "REJECTED").length,
    };
  }, [sessionClusters]);

  const visibleClusters = useMemo(() => {
    return sessionClusters.filter(c => {
      if (filterTab === "PENDING") {
        if (!(c.identity_status === "UNKNOWN" || c.identity_status === "CANDIDATE" || c.status === "UNASSIGNED")) return false;
      } else if (filterTab === "CONFIRMED") {
        if (!(c.identity_status === "CONFIRMED" || c.status === "ASSIGNED")) return false;
      } else if (filterTab === "CANDIDATE") {
        if (c.identity_status !== "CANDIDATE") return false;
      } else if (filterTab === "UNKNOWN") {
        if (!(c.identity_status === "UNKNOWN" || (c.status === "UNASSIGNED" && c.identity_status !== "CANDIDATE"))) return false;
      } else if (filterTab === "REJECTED") {
        if (!(c.identity_status === "REJECTED" || c.status === "REJECTED")) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesId = c.clusterId.toLowerCase().includes(q) || `cluster #${c.clusterNumber}`.includes(q);
        const matchesName = c.assignedStudentName?.toLowerCase().includes(q) || c.assignedStudent?.name?.toLowerCase().includes(q);
        const matchesUsn = c.assignedUsn?.toLowerCase().includes(q) || c.assignedStudent?.usn?.toLowerCase().includes(q);
        const matchesCandidate = c.candidateMatch?.name?.toLowerCase().includes(q) || c.candidateMatch?.usn?.toLowerCase().includes(q);
        const matchesStatus = c.identity_status.toLowerCase().includes(q);
        return matchesId || matchesName || matchesUsn || matchesCandidate || matchesStatus;
      }
      return true;
    });
  }, [sessionClusters, filterTab, search]);

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-64px)] overflow-hidden bg-bg-primary">

      {/* ── Toast Notifications ── */}
      <AnimatePresence>
        {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── Interactive Modals ── */}
      <AnimatePresence>
        {showCreate && <CreateSessionModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
        {assignTarget && <AssignModal cluster={assignTarget} onClose={() => setAssignTarget(null)} onDone={handleAssigned} />}
        {enrollTarget && <EnrollModal cluster={enrollTarget} activeSessionId={activeId} onClose={() => setEnrollTarget(null)} onEnrolled={handleEnrolled} />}
        {detailsTarget && <ClusterDetailsModal cluster={detailsTarget} onClose={() => setDetailsTarget(null)} onDelete={handleDeleteCluster} />}
      </AnimatePresence>

      {/* ═══ LEFT SIDEBAR ═══════════════════════════════════════════ */}
      <aside className="w-full lg:w-72 shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-glass-border bg-glass-medium backdrop-blur-2xl">
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
              { n: clusters.filter(c => c.identity_status === "CONFIRMED" || c.status === "ASSIGNED").length, l: "Confirmed", c: "text-emerald-400" },
              { n: clusters.filter(c => c.identity_status === "UNKNOWN" || c.status === "UNASSIGNED").length, l: "Pending", c: "text-amber-400" },
            ].map(({ n, l, c }) => (
              <div key={l} className="bg-glass-light rounded-xl py-2 border border-glass-border">
                <p className={cn("text-sm font-bold", c)}>{n}</p>
                <p className="text-[9px] text-text-muted uppercase tracking-wider">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 max-h-56 lg:max-h-none overflow-y-auto p-3 space-y-2">
          {loadingSessions && (
            <div className="flex items-center justify-center py-8 text-text-muted text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading sessions...
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
            <Plus className="w-3.5 h-3.5" /> New Enrollment Session
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {active ? (
          <>
            {/* ── Active Session Top Summary ── */}
            <div className="px-4 sm:px-6 py-4 border-b border-glass-border bg-glass-light backdrop-blur-xl shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
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
                <div className="flex flex-wrap items-center gap-2">
                  {(active.status === "PENDING" || active.status === "FAILED") && (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <select
                        value={selectedDetector}
                        onChange={(e) => setSelectedDetector(e.target.value)}
                        className="bg-black/60 text-xs font-mono text-blue-300 border border-blue-500/40 rounded-xl px-3 py-2 outline-none focus:border-blue-400 w-full sm:w-auto"
                      >
                        <option value="yolo26">Detection Mode: Standard (High Speed)</option>
                        <option value="combined">Detection Mode: Combined (High Recall)</option>
                        <option value="scrfd">Detection Mode: Wide-Angle (Legacy)</option>
                      </select>
                      <button onClick={handleStartProcessing} disabled={!!processingSessionId}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] w-full sm:w-auto justify-center">
                        {processingSessionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {active.status === "FAILED" ? "Retry AI Processing" : "Start AI Processing"}
                      </button>
                    </div>
                  )}
                  {active.status === "REVIEW_REQUIRED" && counts.pending === 0 && (
                    <button onClick={handleFinalize}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <Shield className="w-4 h-4" /> Finalize Session
                    </button>
                  )}
                  {active.status !== "PROCESSING" && active.status !== "PENDING" && active.status !== "FAILED" && (
                    <button onClick={() => handleReclusterSession(active.id)}
                      title="Re-process facial feature grouping on session tracks"
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-semibold transition-all">
                      <Sparkles className="w-3.5 h-3.5" /> Re-Cluster Tracks
                    </button>
                  )}
                  {active.status === "PROCESSING" && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStopProcessing(active.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold transition-all">
                        <XCircle className="w-3.5 h-3.5" /> Stop & Cluster
                      </button>
                      <button onClick={() => loadClusters(active.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-glass-light hover:bg-glass-medium border border-glass-border text-text-muted rounded-xl text-xs transition-all">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
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

              {/* Real Metrics Row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <StatChip icon={FileVideo} label="Videos" value={active.totalVideos} color="text-blue-400" />
                <StatChip icon={ImageIcon} label="Frames" value={(active.evaluatedFrames ?? active.processedFrames ?? 0).toLocaleString()} color="text-purple-400" />
                <StatChip icon={ScanFace} label="Detections" value={(active.detectedFacesCount ?? 0).toLocaleString()} color="text-cyan-400" />
                <StatChip icon={Layers} label="Tracks" value={(active.totalTracks ?? active.activeTracks ?? 0).toLocaleString()} color="text-yellow-400" />
                <StatChip icon={Sparkles} label="Samples" value={(active.qualitySamples ?? 0).toLocaleString()} color="text-pink-400" />
                <StatChip icon={Users} label="Identity Candidates" value={counts.all} color="text-amber-400" />
                <StatChip icon={CheckCircle2} label="Confirmed Students" value={counts.confirmed} color="text-emerald-400" />
              </div>

              {/* Failure Banner (when status === "FAILED") */}
              {active.status === "FAILED" && (
                <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between gap-3 text-red-400 text-xs flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>
                      <strong className="text-red-300">AI Processing Failed:</strong>{" "}
                      {active.errorMessage || "The AI service on port 8000 was unreachable or encountered an error."}
                    </span>
                  </div>
                  <button
                    onClick={handleStartProcessing}
                    disabled={!!processingSessionId}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    {processingSessionId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Retry Processing
                  </button>
                </div>
              )}

              {/* Live Tracking Feed Panel (during processing) */}
              {active.status === "PROCESSING" && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-glass-medium border border-blue-500/30 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">AI Live Face Tracking Feed</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        Face Detection Active · Biometric Verification Engine
                      </span>
                    </div>

                    <div className="relative aspect-video max-h-64 rounded-xl overflow-hidden bg-black/60 border border-glass-border flex items-center justify-center">
                      <LiveTrackingImage sessionId={active.id} />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-text-muted mt-2 flex-wrap gap-2">
                      <span>Evaluated Frames: {(active.evaluatedFrames ?? active.processedFrames ?? 0).toLocaleString()}</span>
                      <span>Active Tracks: {active.activeTracks ?? 0}</span>
                      <span>Total Tracks: {active.totalTracks ?? 0}</span>
                      <span>Quality Samples: {active.qualitySamples ?? 0}</span>
                      <span>Facial Samples: {active.arcfaceEmbeddings ?? 0}</span>
                      <span>Current Frame Faces: {active.currentFrameFaces ?? 0}</span>
                      <span>FPS: {active.processingFps ? active.processingFps.toFixed(1) : "0.0"}</span>
                      <span>Progress: {Math.round(active.progressPercentage)}%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
                      <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-blue-400" /><span>AI pipeline evaluating video frames...</span></span>
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

            {/* ═══ CLUSTER MANAGEMENT & STUDENT ASSIGNMENT AREA ═══════════════ */}
            <div className="px-4 sm:px-6 py-3 border-b border-glass-border shrink-0 flex items-center gap-3 bg-glass-light flex-wrap">
              {/* Search Clusters Input */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clusters, USN, student name..."
                  className="bg-glass-light border border-glass-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-blue-500/50 placeholder:text-text-muted w-full sm:w-60 transition-all"
                />
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
                {([
                  ["ALL",       `All (${counts.all})`],
                  ["PENDING",   `Pending (${counts.pending})`],
                  ["CONFIRMED", `Confirmed (${counts.confirmed})`],
                  ["CANDIDATE", `Candidate (${counts.candidate})`],
                  ["UNKNOWN",   `Unknown (${counts.unknown})`],
                  ["REJECTED",  `Rejected (${counts.rejected})`],
                ] as const).map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => setFilterTab(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all",
                      filterTab === f
                        ? f === "PENDING"   ? "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-sm"
                        : f === "CONFIRMED" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm"
                        : f === "CANDIDATE" ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-sm"
                        : f === "UNKNOWN"   ? "bg-slate-500/15 border-slate-500/40 text-slate-300 shadow-sm"
                        : f === "REJECTED"  ? "bg-red-500/15 border-red-500/35 text-red-400 shadow-sm"
                        : "bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-sm"
                        : "bg-glass-light border-glass-border text-text-muted hover:bg-glass-medium"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2.5 text-[10px] text-text-muted">
                {active.status === "PROCESSING" && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-bold tracking-wide shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE FACE TRACKING ({sessionClusters.length} IDENTITIES)
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>Student Session Groups · Biometric Verification Directory</span>
                </div>
              </div>
            </div>

            {/* ── Clusters Cards Grid ── */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingClusters ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center gap-3 text-text-muted text-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> Loading identity clusters from AI pipeline...
                  </div>
                </div>
              ) : visibleClusters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border",
                    active.status === "FAILED" ? "bg-red-500/10 border-red-500/20" : "bg-blue-500/10 border-blue-500/20"
                  )}>
                    {active.status === "FAILED" ? (
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    ) : (
                      <ScanFace className="w-8 h-8 text-blue-400" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">
                    {search
                      ? "No matching clusters found"
                      : active.status === "PROCESSING"
                      ? "Detecting Faces & Initializing Tracks..."
                      : active.status === "FAILED"
                      ? "AI Processing Failed"
                      : "No Clusters Available"}
                  </h3>
                  <p className="text-xs text-text-muted max-w-sm leading-relaxed">
                    {search
                      ? "Try adjusting your search query or filter tab."
                      : active.status === "PROCESSING"
                      ? "Live face tracks and student identity cards will appear here in real-time as faces are detected in the classroom video."
                      : active.status === "FAILED"
                      ? (active.errorMessage || "The AI processing encountered an issue. Ensure the AI service is running and click Retry below.")
                      : "Start AI Processing to detect faces and generate student identity clusters from video."}
                  </p>
                  {(active.status === "PENDING" || active.status === "FAILED") && (
                    <button onClick={handleStartProcessing} disabled={!!processingSessionId}
                      className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      {processingSessionId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : active.status === "FAILED" ? <RefreshCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {active.status === "FAILED" ? "Retry AI Processing" : "Start AI Processing"}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}
                >
                  {visibleClusters.map((c) => (
                    <ClusterCard
                      key={c.id}
                      c={c}
                      onAssign={setAssignTarget}
                      onConfirmCandidate={handleConfirmCandidate}
                      onReject={handleReject}
                      onEnroll={setEnrollTarget}
                      onDetails={setDetailsTarget}
                      onDelete={handleDeleteCluster}
                    />
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
              <Plus className="w-4 h-4" /> Create Enrollment Session
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
