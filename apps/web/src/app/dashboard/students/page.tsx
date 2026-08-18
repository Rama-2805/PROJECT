"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Download, X,
  Loader2, RefreshCw, Mail, Phone, User,
  GraduationCap, Users, CheckCircle2, AlertCircle,
  BadgeCheck, Key, ShieldCheck, Fingerprint, ScanFace,
  Eye, Sparkles, ChevronRight, ExternalLink, Calendar,
  Layers, Check, Trash2, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiRequest } from "@/lib/api/client";
import Link from "next/link";

const AI_BASE = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8000";

function resolveImageUrl(path?: any): string | null {
  if (!path) return null;
  const raw = typeof path === "string" ? path : (path.imagePath || path.imageUrl || path.url || path.path || "");
  if (!raw || typeof raw !== "string") return null;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/")) return `${AI_BASE}${raw}`;
  if (raw.includes("storage/")) {
    const sub = raw.split("storage/")[1];
    return `${AI_BASE}/storage/${sub}`;
  }
  return `${AI_BASE}/storage/${raw}`;
}

/* ═══════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════ */
interface Department { id: string; name: string; code: string; }
interface Course     { id: string; name: string; code: string; }

interface Student {
  id: string;
  studentId: string;
  rollNumber?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  semester: number;
  section?: string | null;
  status: string;
  faceEnrolled: boolean;
  faceSamples?: number;
  profilePhoto?: string | null;
  primaryFaceImagePath?: string | null;
  attendancePercentage: number;
  department: Department;
  course: Course;
}

interface BiometricsData {
  studentId: string;
  fullName: string;
  usn: string;
  email?: string;
  department?: string;
  departmentCode?: string;
  semester?: number;
  section?: string;
  gender?: string;
  faceEnrolled: boolean;
  faceSamples: number;
  profilePhoto?: string | null;
  primaryFaceImagePath?: string | null;
  clusters: Array<{
    id: string;
    clusterNumber: number;
    sampleCount: number;
    qualityAvg: number;
    confidence: number;
    bestImagePath?: string;
    status: string;
    sessionName?: string;
    sessionDate?: string;
    images: Array<{
      id: string;
      imagePath?: string;
      qualityScore: number;
      isBest: boolean;
      timestampSec: number;
    }>;
  }>;
  faceImages: Array<{
    id: string;
    imagePath: string;
    qualityScore: number;
    isPrimary: boolean;
  }>;
  embeddingsCount: number;
}

const GENDER_COLORS: Record<string, string> = {
  Male:   "text-blue-400 bg-blue-500/10 border-blue-500/30",
  Female: "text-pink-400 bg-pink-500/10 border-pink-500/30",
};

const PAGE_SIZE = 1000;

/* ═══════════════════════════════════════════════════════════════════
   AVATAR
═══════════════════════════════════════════════════════════════════ */
function Avatar({
  name,
  gender,
  photo,
  isEnrolled,
  onClick,
}: {
  name: string;
  gender?: string | null;
  photo?: string | null;
  isEnrolled?: boolean;
  onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const letter = name?.charAt(0)?.toUpperCase() || "?";
  const isFemale = gender?.toLowerCase().includes("f");
  const fullUrl = resolveImageUrl(photo);

  return (
    <div
      onClick={onClick}
      className={cn("relative shrink-0", onClick && "cursor-pointer group/avatar")}
      title={isEnrolled ? "View Biometric Face Cluster" : undefined}
    >
      {fullUrl && !imgError ? (
        <img
          src={fullUrl}
          alt={name}
          onError={() => setImgError(true)}
          className={cn(
            "w-9 h-9 rounded-full object-cover border-2 transition-transform duration-200 group-hover/avatar:scale-105",
            isEnrolled
              ? "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
              : "border-glass-border"
          )}
        />
      ) : (
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border shrink-0 transition-transform duration-200 group-hover/avatar:scale-105",
            isFemale
              ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-500/30 text-pink-300"
              : "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300"
          )}
        >
          {letter}
        </div>
      )}
      {isEnrolled && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#111111] flex items-center justify-center shadow-sm">
          <Check className="w-2 h-2 text-black stroke-[3]" />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SKELETON ROW
═══════════════════════════════════════════════════════════════════ */
function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-glass-border/30 items-center animate-pulse">
      <div className="col-span-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-glass-light" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-glass-light rounded w-3/4" />
          <div className="h-2.5 bg-glass-light/50 rounded w-1/2" />
        </div>
      </div>
      <div className="col-span-1"><div className="h-4 bg-glass-light rounded-full w-8" /></div>
      <div className="col-span-2"><div className="h-4 bg-glass-light rounded-full w-24" /></div>
      <div className="col-span-2"><div className="h-3 bg-glass-light rounded w-5/6" /></div>
      <div className="col-span-2"><div className="h-3 bg-glass-light rounded w-2/3" /></div>
      <div className="col-span-1"><div className="h-3 bg-glass-light rounded w-1/2" /></div>
      <div className="col-span-1"><div className="h-5 bg-glass-light rounded-full w-12" /></div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STUDENT BIOMETRICS & FACE CLUSTER MODAL
═══════════════════════════════════════════════════════════════════ */
function StudentBiometricsModal({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const [data, setData] = useState<BiometricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);

  const fetchBiometrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<BiometricsData>(`/students/${student.id}/biometrics`);
      if (res && !res.error && !(res as any).statusCode) {
        const bioData: BiometricsData = (res as any).data || res;
        setData(bioData);
      }
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }, [student.id]);

  useEffect(() => {
    fetchBiometrics();
  }, [fetchBiometrics]);

  const usn = student.studentId || student.rollNumber || "USN";
  const photoUrl = resolveImageUrl(data?.profilePhoto || student.profilePhoto);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="bg-[#0f0f13] border border-glass-border/80 rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative"
      >
        {/* Top Accent Gradient */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border/40 bg-glass-light/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ScanFace className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                Biometric Face Profile & Cluster
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {student.faceEnrolled ? "ENROLLED IN FAISS" : "PENDING DATA"}
                </span>
              </h2>
              <p className="text-xs text-text-muted">
                {student.fullName} • <span className="font-mono text-text-secondary">{usn}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-glass-light hover:bg-glass-medium text-text-muted hover:text-text-primary flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs">Loading biometric telemetry and face cluster images...</p>
            </div>
          ) : (
            <>
              {/* Profile Overview Strip */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-glass-light/60 to-glass-medium/40 border border-glass-border/60 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative shrink-0">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={student.fullName}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-2xl">
                      {student.fullName.charAt(0)}
                    </div>
                  )}
                  {student.faceEnrolled && (
                    <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full text-black shadow-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-base font-bold text-text-primary">{student.fullName}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold">
                      {student.department?.code || data?.departmentCode || "CSE"} • Sem {student.semester}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-emerald-400">USN: {usn}</p>
                  {student.email && (
                    <p className="text-xs text-text-muted font-mono truncate">{student.email}</p>
                  )}
                </div>

                <div className="text-right sm:border-l sm:border-glass-border/40 sm:pl-5 space-y-1 shrink-0">
                  <span className="text-[10px] text-text-muted uppercase font-semibold block">FAISS Biometric Index</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>{data?.faceSamples || (student.faceEnrolled ? 1 : 0)} Vectors</span>
                  </div>
                </div>
              </div>

              {/* Technical AI Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-glass-light/40 border border-glass-border/40">
                  <p className="text-[10px] text-text-muted uppercase font-semibold">Vector Model</p>
                  <p className="text-xs font-bold text-text-primary font-mono mt-0.5">ArcFace 512D</p>
                  <p className="text-[9px] text-emerald-400 font-mono">L2 Normalized</p>
                </div>
                <div className="p-3 rounded-xl bg-glass-light/40 border border-glass-border/40">
                  <p className="text-[10px] text-text-muted uppercase font-semibold">Detector</p>
                  <p className="text-xs font-bold text-text-primary font-mono mt-0.5">SCRFD 10G</p>
                  <p className="text-[9px] text-blue-400 font-mono">Multi-Scale Gated</p>
                </div>
                <div className="p-3 rounded-xl bg-glass-light/40 border border-glass-border/40">
                  <p className="text-[10px] text-text-muted uppercase font-semibold">Quality Gate</p>
                  <p className="text-xs font-bold text-text-primary font-mono mt-0.5">MediaPipe Mesh</p>
                  <p className="text-[9px] text-purple-400 font-mono">Yaw/Pitch/Roll Checked</p>
                </div>
                <div className="p-3 rounded-xl bg-glass-light/40 border border-glass-border/40">
                  <p className="text-[10px] text-text-muted uppercase font-semibold">Match Metric</p>
                  <p className="text-xs font-bold text-text-primary font-mono mt-0.5">Cosine Sim ≥ 0.60</p>
                  <p className="text-[9px] text-text-muted font-mono">Strict Invariant</p>
                </div>
              </div>

              {/* Cluster Sessions & Captured Crops Gallery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Enrolled Face Crops & Session Clusters
                  </h4>
                  <span className="text-[11px] font-mono text-text-muted">
                    {(data?.clusters?.length || 0)} Associated Session Clusters
                  </span>
                </div>

                {data?.clusters && data.clusters.length > 0 ? (
                  <div className="space-y-4">
                    {data.clusters.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        className="p-4 rounded-xl bg-glass-light/30 border border-glass-border/40 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-glass-border/30 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary font-mono">
                              Cluster #{c.clusterNumber}
                            </span>
                            {c.sessionName && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-glass-medium text-text-secondary border border-glass-border">
                                {c.sessionName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-mono">
                            <span className="text-text-muted">
                              Samples: <strong className="text-text-primary">{c.sampleCount}</strong>
                            </span>
                            <span className="text-text-muted">
                              Avg Quality:{" "}
                              <strong className="text-emerald-400">
                                {typeof c.qualityAvg === "number" ? c.qualityAvg.toFixed(1) : "—"}%
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Images Gallery */}
                        {c.images && c.images.length > 0 ? (
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {c.images.map((img, iIdx) => {
                              const imgUrl = resolveImageUrl(img.imagePath);
                              if (!imgUrl) return null;
                              return (
                                <div
                                  key={img.id || iIdx}
                                  onClick={() => setSelectedCrop(imgUrl)}
                                  className="group/crop relative aspect-square rounded-xl overflow-hidden border border-glass-border bg-black/40 cursor-pointer hover:border-emerald-500/80 transition-all hover:scale-105"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Crop ${iIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  {img.isBest && (
                                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-emerald-500 text-[8px] font-bold text-black font-mono shadow">
                                      BEST
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover/crop:opacity-100 transition-opacity">
                                    <p className="text-[8px] text-white font-mono text-center">
                                      Q: {typeof img.qualityScore === "number" ? img.qualityScore.toFixed(0) : "—"}%
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : c.bestImagePath ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveImageUrl(c.bestImagePath) || ""}
                              alt="Best crop"
                              className="w-16 h-16 rounded-xl object-cover border border-emerald-500/40"
                            />
                            <div className="text-xs text-text-muted">
                              <p className="font-semibold text-text-secondary">Primary Cluster Exemplar</p>
                              <p className="text-[10px]">Registered during live video enrollment session</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-text-muted">No individual crop frames archived for this cluster.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : photoUrl ? (
                  <div className="p-4 rounded-xl bg-glass-light/30 border border-glass-border/40 flex items-center gap-4">
                    <img
                      src={photoUrl}
                      alt="Enrolled crop"
                      className="w-20 h-20 rounded-xl object-cover border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-text-primary">Verified Primary Face Exemplar</p>
                      <p className="text-xs text-text-muted">
                        ArcFace 512D feature embeddings successfully extracted and indexed in the FAISS vector space for automatic attendance logging.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-glass-light/20 border border-dashed border-glass-border text-center space-y-2">
                    <ScanFace className="w-8 h-8 mx-auto text-text-muted" />
                    <p className="text-xs font-semibold text-text-secondary">No Face Clusters Enrolled Yet</p>
                    <p className="text-[11px] text-text-muted max-w-md mx-auto">
                      This student has not yet been assigned to a face cluster in an AI Enrollment session.
                    </p>
                    <Link
                      href="/dashboard/face-enrollment"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all mt-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Go to AI Enrollment Dashboard
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-glass-border/40 bg-glass-light/40 flex items-center justify-between shrink-0">
          <Link
            href="/dashboard/face-enrollment"
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open AI Enrollment Studio</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-glass-light hover:bg-glass-medium border border-glass-border text-xs font-semibold text-text-primary transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* High-Res Image Lightbox Modal */}
        {selectedCrop && (
          <div
            onClick={() => setSelectedCrop(null)}
            className="fixed inset-0 z-60 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl cursor-zoom-out"
          >
            <div className="relative max-w-lg w-full bg-[#111111] p-2 rounded-2xl border border-emerald-500/40 shadow-2xl">
              <img
                src={selectedCrop}
                alt="Enlarged Face Crop"
                className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
              />
              <p className="text-[10px] text-center text-text-muted mt-2 font-mono">
                Click anywhere to close full resolution crop
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function StudentsPage() {
  const [students,    setStudents]    = useState<Student[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter,  setDeptFilter]  = useState("ALL");
  const [semFilter,   setSemFilter]   = useState("ALL");
  const [genderFilter,setGenderFilter]= useState("ALL");
  const [faceFilter,  setFaceFilter]  = useState<"ALL" | "ENROLLED" | "PENDING">("ALL");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedBiometricsStudent, setSelectedBiometricsStudent] = useState<Student | null>(null);

  const [resetModalStudent, setResetModalStudent] = useState<Student | null>(null);
  const [resetting, setResetting] = useState(false);
  const [deleteModalStudent, setDeleteModalStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Load departments once ─────────────────────────────────────
  useEffect(() => {
    apiRequest<any>("/departments").then(res => {
      if (res && !res.error && !(res as any).statusCode) {
        const list = Array.isArray(res) 
          ? res 
          : (Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
        setDepartments(list);
      }
    });
  }, []);

  // ── Fetch students ────────────────────────────────────────────
  const fetchStudents = useCallback(async (
    pageNum: number,
    search: string,
    deptId: string,
    semesterVal: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(PAGE_SIZE),
        sortBy: "studentId",
        sortOrder: "asc",
      });
      if (search)            params.set("search", search);
      if (deptId !== "ALL")  params.set("departmentId", deptId);
      if (semesterVal !== "ALL") params.set("semester", semesterVal);

      const res = await apiRequest<any>(`/students?${params}`);
      
      if (res && !res.error && !(res as any).statusCode) {
        let studentList: Student[] = [];
        if (Array.isArray(res)) {
          studentList = res;
        } else if (Array.isArray(res.data)) {
          studentList = res.data;
        } else if (Array.isArray(res.data?.data)) {
          studentList = res.data.data;
        }

        const totalCount = typeof (res as any).total === "number"
          ? (res as any).total
          : (typeof res.data?.total === "number" ? res.data.total : studentList.length);

        const pagesCount = typeof (res as any).totalPages === "number"
          ? (res as any).totalPages
          : (typeof res.data?.totalPages === "number" ? res.data.totalPages : Math.ceil(totalCount / PAGE_SIZE));

        setStudents(studentList);
        setTotal(totalCount);
        setTotalPages(Math.max(1, pagesCount));
      } else {
        const rawRes = res as any;
        const errMsg = Array.isArray(rawRes?.message) ? rawRes.message.join(", ") : (rawRes?.message || rawRes?.error || "Failed to load students");
        setError(errMsg);
      }
    } catch {
      setError("Network error — could not reach the API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(page, searchQuery, deptFilter, semFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchStudents, page, searchQuery, deptFilter, semFilter]);

  // Client-side filtering & sorting
  const displayStudents = useMemo(() => {
    let list = students;
    if (genderFilter !== "ALL") {
      list = list.filter(s =>
        s.gender?.toLowerCase().startsWith(genderFilter[0].toLowerCase())
      );
    }
    if (faceFilter === "ENROLLED") {
      list = list.filter(s => s.faceEnrolled);
    } else if (faceFilter === "PENDING") {
      list = list.filter(s => !s.faceEnrolled);
    }
    return [...list].sort((a, b) => {
      const usnA = a.studentId || a.rollNumber || "";
      const usnB = b.studentId || b.rollNumber || "";
      return usnA.localeCompare(usnB, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [students, genderFilter, faceFilter]);

  const handleConfirmResetPassword = async () => {
    if (!resetModalStudent) return;
    setResetting(true);
    try {
      const res = await apiRequest<any>(`/students/${resetModalStudent.id}/reset-password`, {
        method: "POST",
      });
      if (res && !res.error && !(res as any).statusCode) {
        setToastMessage(`🔑 Password for ${resetModalStudent.fullName} (${resetModalStudent.studentId}) has been reset to demo123`);
        setTimeout(() => setToastMessage(null), 6000);
      } else {
        alert((res as any)?.message || res?.error || "Failed to reset password");
      }
    } catch {
      alert("Network error — could not reset password.");
    } finally {
      setResetting(false);
      setResetModalStudent(null);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deleteModalStudent) return;
    setDeleting(true);
    try {
      const res = await apiRequest<any>(`/students/${deleteModalStudent.id}`, {
        method: "DELETE",
      });
      if (res && !res.error && !(res as any).statusCode) {
        setStudents(prev => prev.filter(s => s.id !== deleteModalStudent.id));
        setTotal(prev => Math.max(0, prev - 1));
        setToastMessage(`🗑️ Student "${deleteModalStudent.fullName}" (${deleteModalStudent.studentId || deleteModalStudent.rollNumber}) deleted.`);
        setTimeout(() => setToastMessage(null), 6000);
      } else {
        alert((res as any)?.message || res?.error || "Failed to delete student");
      }
    } catch {
      alert("Network error — could not delete student.");
    } finally {
      setDeleting(false);
      setDeleteModalStudent(null);
    }
  };

  const handleResetAllEnrollments = async () => {
    setResettingAll(true);
    try {
      const res = await apiRequest<any>("/students/reset-all-enrollment", { method: "POST" });
      if (res && !res.error && !(res as any).statusCode) {
        setToastMessage("🧹 All student biometric face enrollments and FAISS vectors have been reset.");
        setTimeout(() => setToastMessage(null), 5000);
        fetchStudents(page, searchQuery, deptFilter, semFilter);
      } else {
        alert((res as any)?.message || res?.error || "Failed to reset face enrollments");
      }
    } catch {
      alert("Network error while resetting face enrollments.");
    } finally {
      setResettingAll(false);
      setShowResetAllModal(false);
    }
  };

  // Stats
  const maleCount   = students.filter(s => s.gender?.toLowerCase().startsWith("m")).length;
  const femaleCount = students.filter(s => s.gender?.toLowerCase().startsWith("f")).length;
  const enrolledCount = students.filter(s => s.faceEnrolled).length;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["USN", "Name", "Gender", "Face Enrolled", "College Email", "Mobile", "Department", "Semester", "Status"];
    const rows = displayStudents.map(s => [
      s.studentId || s.rollNumber || "",
      s.fullName,
      s.gender || "",
      s.faceEnrolled ? "Yes" : "No",
      s.email || "",
      s.phone || "",
      s.department?.code || "",
      s.semester,
      s.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `CSE_Students_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide flex items-center gap-2.5">
            <span>Student Directory</span>
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {loading ? "Loading..." : `${total.toLocaleString()} students across all departments`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/face-enrollment"
            className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Enrollment Studio</span>
          </Link>
          <button
            onClick={() => setShowResetAllModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-400 transition-all cursor-pointer"
            title="Reset face biometrics for all students"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Faces</span>
          </button>
          <button
            onClick={() => fetchStudents(page, searchQuery, deptFilter, semFilter)}
            className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass-light px-3 py-2 text-sm text-text-primary hover:bg-glass-medium transition-colors cursor-pointer"
            title="Refresh Directory & Biometric Telemetry"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass-light px-4 py-2 text-xs font-semibold text-text-primary hover:bg-glass-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats Strip ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Students",   value: total,         icon: Users,        color: "text-blue-400",  filter: "ALL" },
          { label: "Male",             value: maleCount,     icon: User,         color: "text-blue-400",  filter: "ALL" },
          { label: "Female",           value: femaleCount,   icon: User,         color: "text-pink-400",  filter: "ALL" },
          { label: "Face Enrolled",    value: enrolledCount, icon: BadgeCheck,   color: "text-emerald-400", filter: "ENROLLED" },
        ].map(({ label, value, icon: Icon, color, filter }) => (
          <div
            key={label}
            onClick={() => {
              if (label === "Face Enrolled") {
                setFaceFilter(prev => (prev === "ENROLLED" ? "ALL" : "ENROLLED"));
              }
            }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border border-glass-border bg-glass-light backdrop-blur-md transition-all cursor-pointer hover:bg-glass-medium",
              label === "Face Enrolled" && faceFilter === "ENROLLED" && "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            )}
          >
            <Icon className={cn("w-5 h-5 shrink-0", color)} />
            <div>
              <p className="text-lg font-bold text-text-primary leading-none">{value}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-glass-border bg-glass-light backdrop-blur-md">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search name, USN, email..."
            className="w-full bg-bg-primary/20 border border-glass-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted shrink-0" />

          {/* Biometrics Face Status Filter */}
          <select
            value={faceFilter}
            onChange={e => setFaceFilter(e.target.value as any)}
            className="bg-bg-primary/20 border border-glass-border rounded-lg px-3 py-2 text-xs font-semibold text-text-secondary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="ALL" className="bg-bg-secondary">All Biometric Statuses</option>
            <option value="ENROLLED" className="bg-bg-secondary">✓ Face Enrolled in FAISS</option>
            <option value="PENDING" className="bg-bg-secondary">Pending Face Data</option>
          </select>

          {/* Semester Filter */}
          <select
            value={semFilter}
            onChange={e => { setSemFilter(e.target.value); setPage(1); }}
            className="bg-bg-primary/20 border border-glass-border rounded-lg px-3 py-2 text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <option value="ALL" className="bg-bg-secondary">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
              <option key={s} value={String(s)} className="bg-bg-secondary">Semester {s}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
            className="bg-bg-primary/20 border border-glass-border rounded-lg px-3 py-2 text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <option value="ALL" className="bg-bg-secondary">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id} className="bg-bg-secondary">{d.code} — {d.name}</option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="bg-bg-primary/20 border border-glass-border rounded-lg px-3 py-2 text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <option value="ALL" className="bg-bg-secondary">All Genders</option>
            <option value="Male"   className="bg-bg-secondary">Male</option>
            <option value="Female" className="bg-bg-secondary">Female</option>
          </select>
        </div>
      </div>

      {/* ── Toast Notification Banner ─────────────────────── */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-amber-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="flex-1 rounded-xl border border-glass-border bg-glass-medium backdrop-blur-md overflow-hidden flex flex-col min-h-0">

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-glass-border bg-glass-light text-[10px] font-semibold text-text-muted uppercase tracking-wider shrink-0">
          <div className="col-span-3">Student / USN</div>
          <div className="col-span-1">Gender</div>
          <div className="col-span-2">Biometric Status</div>
          <div className="col-span-2">College Email</div>
          <div className="col-span-2">Mobile</div>
          <div className="col-span-1">Dept / Sem</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-text-muted">{error}</p>
              <button
                onClick={() => fetchStudents(page, searchQuery, deptFilter, semFilter)}
                className="text-xs text-blue-400 hover:underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {/* Skeleton loading */}
          {loading && !error && Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)}

          {/* Empty state */}
          {!loading && !error && displayStudents.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <GraduationCap className="w-8 h-8 text-text-muted" />
              <p className="text-sm text-text-muted">No students found</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-xs text-blue-400 hover:underline cursor-pointer">
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Student Rows */}
          {!loading && !error && displayStudents.map((student, idx) => {
            const usn    = student.studentId || student.rollNumber || "—";
            const gender = student.gender?.trim() || null;
            const gClass = gender ? (GENDER_COLORS[gender] || "text-text-muted bg-glass-light border-glass-border") : "";

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-glass-border/30 hover:bg-glass-light/40 transition-colors items-center group"
              >
                {/* Name + USN + Face Thumbnail */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <Avatar
                    name={student.fullName}
                    gender={gender}
                    photo={student.profilePhoto || student.primaryFaceImagePath}
                    isEnrolled={student.faceEnrolled}
                    onClick={() => setSelectedBiometricsStudent(student)}
                  />
                  <div className="min-w-0">
                    <p
                      onClick={() => setSelectedBiometricsStudent(student)}
                      className="text-sm font-semibold text-text-primary truncate leading-tight hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      {student.fullName}
                    </p>
                    <p className="text-[11px] text-text-muted font-mono truncate mt-0.5">
                      {usn}
                    </p>
                  </div>
                </div>

                {/* Gender */}
                <div className="col-span-1">
                  {gender ? (
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                      gClass
                    )}>
                      {gender[0]}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </div>

                {/* Biometric Status & Cluster View Button */}
                <div className="col-span-2 flex items-center gap-2">
                  {student.faceEnrolled ? (
                    <button
                      onClick={() => setSelectedBiometricsStudent(student)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400 text-[11px] font-semibold transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)] group-hover:border-emerald-500/60 cursor-pointer"
                      title="Click to view full face cluster and 512D ArcFace embeddings"
                    >
                      <Fingerprint className="w-3.5 h-3.5 shrink-0" />
                      <span>Enrolled</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedBiometricsStudent(student)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-glass-light hover:bg-glass-medium border border-glass-border/60 text-text-muted text-[10px] font-medium transition-colors cursor-pointer"
                      title="Pending facial enrollment"
                    >
                      <ScanFace className="w-3 h-3 text-text-muted" />
                      <span>Pending</span>
                    </button>
                  )}
                </div>

                {/* College Email */}
                <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                  {student.email ? (
                    <>
                      <Mail className="w-3 h-3 text-text-muted shrink-0" />
                      <span className="text-xs text-text-secondary truncate font-mono">
                        {student.email}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </div>

                {/* Mobile */}
                <div className="col-span-2 flex items-center gap-1.5">
                  {student.phone ? (
                    <>
                      <Phone className="w-3 h-3 text-text-muted shrink-0" />
                      <span className="text-xs text-text-secondary font-mono">
                        {student.phone}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </div>

                {/* Department & Sem */}
                <div className="col-span-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20">
                    {student.department?.code || "—"}
                  </span>
                  <p className="text-[10px] text-text-muted mt-0.5 font-mono">
                    S{student.semester}
                  </p>
                </div>

                {/* Actions: View Cluster, Reset Pw, Delete Student */}
                <div className="col-span-1 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setSelectedBiometricsStudent(student)}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                    title={`View Face Cluster for ${student.fullName}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setResetModalStudent(student)}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                    title={`Reset Password for ${student.fullName} (${usn}) to demo123`}
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteModalStudent(student)}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                    title={`Delete Student ${student.fullName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Single-Page Total Footer ─────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-glass-border bg-glass-light shrink-0">
          <p className="text-xs text-text-muted font-medium">
            Showing all <span className="text-text-primary font-semibold font-mono">{displayStudents.length}</span> students
          </p>
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time FAISS Biometric Synchronization Active</span>
          </div>
        </div>
      </div>

      {/* ── Student Biometrics & Face Cluster Modal ─────────── */}
      {selectedBiometricsStudent && (
        <StudentBiometricsModal
          student={selectedBiometricsStudent}
          onClose={() => setSelectedBiometricsStudent(null)}
        />
      )}

      {/* ── Reset Password Modal ───────────────────────────── */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111111] border border-glass-border rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center gap-3 text-amber-400 mb-2">
              <Key className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-text-primary">Reset Student Account Password</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Are you sure you want to reset the login password for <span className="font-semibold text-text-primary">{resetModalStudent.fullName}</span> ({resetModalStudent.studentId || resetModalStudent.rollNumber})?
            </p>
            <div className="bg-glass-light p-3.5 rounded-xl border border-glass-border mb-5 text-xs text-text-muted space-y-1">
              <p className="font-mono text-amber-300 font-semibold">
                🔑 New Temp Password: <span className="underline">demo123</span>
              </p>
              <p className="text-[11px] text-text-muted">
                The student account will require a password update upon their next login.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setResetModalStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResetPassword}
                disabled={resetting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resetting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Confirm Reset
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Delete Student Modal ───────────────────────────── */}
      {deleteModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#141212] border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] relative overflow-hidden"
          >
            <div className="flex items-center gap-3 text-red-400 mb-2">
              <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40">
                <Trash2 className="w-6 h-6 shrink-0 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Delete Student Record</h3>
                <p className="text-[11px] text-text-muted">Permanent Database Deletion</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary mt-3 mb-4 leading-relaxed">
              Are you sure you want to permanently delete student <span className="font-bold text-text-primary">{deleteModalStudent.fullName}</span> (<code className="text-red-300 font-mono">{deleteModalStudent.studentId || deleteModalStudent.rollNumber}</code>)?
            </p>
            <div className="bg-red-500/10 p-3.5 rounded-xl border border-red-500/20 mb-5 text-xs text-red-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                This action cannot be undone.
              </p>
              <p className="text-[11px] text-text-muted">
                All associated face biometric templates, attendance ledger entries, and access credentials will be purged.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModalStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteStudent}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Permanently Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Reset All Face Enrollments Confirmation Modal ───── */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-bg-secondary border border-amber-500/30 p-6 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)]"
          >
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40">
                <RotateCcw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Reset All Enrolled Faces</h3>
                <p className="text-[11px] text-text-muted">Clear Biometric Index & Templates</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary mt-3 mb-4 leading-relaxed">
              Are you sure you want to reset all enrolled face biometrics? This will clear all student face vectors from the FAISS database and mark all student records as un-enrolled.
            </p>
            <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20 mb-5 text-xs text-amber-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Existing student academic records will remain safe.
              </p>
              <p className="text-[11px] text-text-muted">
                Only the ArcFace 512D facial vectors and face crop exemplars will be cleared for re-enrollment.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetAllModal(false)}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllEnrollments}
                disabled={resettingAll}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                {resettingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" /> Reset All Enrolled Faces
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
