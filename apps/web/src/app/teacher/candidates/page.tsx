"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { api } from "@/lib/api/client";
import { 
  ScanFace, Sparkles, RefreshCw, Check, Search, 
  Eye, CheckCircle2, AlertTriangle,
  UserCheck, UserPlus, Layers,
  ShieldCheck, Film
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   TYPES & INTERFACES
═══════════════════════════════════════════════════════════════════ */
function resolveCropUrl(urlOrPath: string | null | undefined): string {
  if (!urlOrPath) return "/placeholder-avatar.png";
  if (urlOrPath.startsWith("http://127.0.0.1:8000")) {
    // Legacy absolute URL — extract relative path
    urlOrPath = urlOrPath.replace("http://127.0.0.1:8000", "");
  }
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://") || urlOrPath.startsWith("data:")) {
    return urlOrPath;
  }
  if (urlOrPath.startsWith("/")) {
    return urlOrPath;
  }
  if (urlOrPath.includes("storage/")) {
    const sub = urlOrPath.split("storage/")[1];
    return `/storage/${sub}`;
  }
  return `/storage/${urlOrPath}`;
}

interface ClusterGalleryItem {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  frameNumber: number;
  qualityScore: number;
  isBest?: boolean;
}

export interface CandidateCluster {
  id: string;
  enrollmentSessionId: string;
  clusterNumber: number;
  sampleCount: number;
  trackCount?: number;
  qualityAvg: number;
  confidence: number;
  bestImagePath: string | null;
  bestImageUrl: string | null;
  status: "UNASSIGNED" | "ASSIGNED" | "REJECTED";
  assignedStudentId?: string | null;
  assignedStudentName?: string;
  assignedStudentUsn?: string;
  gallery?: ClusterGalleryItem[];
  imageCount?: number;
  createdAt: string;
}

export interface StudentOption {
  id: string;
  studentId: string; // USN (e.g. 1VI23CS058)
  rollNumber?: string;
  fullName: string;
  email?: string;
  department?: { name: string; code: string };
  section?: string;
  faceEnrolled?: boolean;
}

interface SessionInfo {
  id: string;
  name: string;
  lectureDate?: string;
  generatedClusters?: number;
  status: string;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function IdentityCandidatesPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [clusters, setClusters] = useState<CandidateCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<CandidateCluster | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNASSIGNED" | "ASSIGNED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Student Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetCluster, setTargetCluster] = useState<CandidateCluster | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  /* ─────────────────────────────────────────────────────────────
     1. FETCH CLUSTERS FOR SESSION
  ───────────────────────────────────────────────────────────── */
  const fetchClustersForSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await api.get<CandidateCluster[]>(`/enrollment/sessions/${sessionId}/clusters`);
      if (res.success && Array.isArray(res.data)) {
        const clusterList = res.data;
        setClusters(clusterList);
        if (clusterList.length > 0) {
          setSelectedCluster(prev => {
            if (!prev) return clusterList[0];
            const updated = clusterList.find(c => c.id === prev.id);
            return updated || clusterList[0];
          });
        } else {
          setSelectedCluster(null);
        }
      }
    } catch (err) {
      console.error("Error fetching clusters for session:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────
     2. FETCH SESSIONS
  ───────────────────────────────────────────────────────────── */
  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get<SessionInfo[]>("/enrollment/sessions");
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSessions(res.data);
        // Default to the first session (or whichever has clusters)
        const sessionWithClusters = res.data.find(s => (s.generatedClusters || 0) > 0) || res.data[0];
        setSelectedSessionId(sessionWithClusters.id);
        fetchClustersForSession(sessionWithClusters.id);
      } else {
        setSessions([]);
        setSelectedSessionId("");
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setSessions([]);
      setSelectedSessionId("");
    }
  }, [fetchClustersForSession]);

  /* ─────────────────────────────────────────────────────────────
     3. FETCH STUDENTS LIST FROM DATABASE
  ───────────────────────────────────────────────────────────── */
  const fetchStudents = async () => {
    if (students.length > 0) return; // already loaded
    setStudentsLoading(true);
    try {
      const res = await api.get<{ data: StudentOption[] }>("/students?limit=250");
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setStudents(list);
      }
    } catch (err) {
      console.error("Error fetching students list:", err);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) fetchSessions();
    });
    return () => {
      isMounted = false;
    };
  }, [fetchSessions]);

  /* ─────────────────────────────────────────────────────────────
     4. OPEN ASSIGN MODAL
  ───────────────────────────────────────────────────────────── */
  const handleOpenAssign = (cluster: CandidateCluster, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetCluster(cluster);
    setSelectedStudent(null);
    setStudentSearch("");
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
    setAssignModalOpen(true);
    fetchStudents();
  };

  /* ─────────────────────────────────────────────────────────────
     5. PERFORM STUDENT ASSIGNMENT
  ───────────────────────────────────────────────────────────── */
  const handleConfirmAssignment = async () => {
    if (!targetCluster || !selectedStudent) return;
    setAssigning(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    const targetClusterId = targetCluster.id;
    const studentId = selectedStudent.id;
    const usn = selectedStudent.studentId || selectedStudent.rollNumber || "";
    const fullName = selectedStudent.fullName;

    try {
      const res = await api.post<{
        success: boolean;
        clusterId: string;
        studentId: string;
        studentName?: string;
        studentUsn?: string;
      }>("/enrollment/clusters/assign-student", {
        clusterId: targetClusterId,
        sessionId: selectedSessionId || targetCluster.enrollmentSessionId,
        existingStudentId: studentId,
        usn,
        fullName,
        force: true, // Guarantees resolution & purge of conflicting old clusters
      });

      if (res.success) {
        // Immediate in-memory React state update without full page refresh!
        setClusters(prevList => {
          return prevList.map(item => {
            // 1. If another cluster previously had this student assigned, unassign it (prevent conflicts)
            if (item.assignedStudentId === studentId && item.id !== targetClusterId) {
              return {
                ...item,
                status: "UNASSIGNED",
                assignedStudentId: null,
                assignedStudentName: undefined,
                assignedStudentUsn: undefined,
              };
            }
            // 2. Update the target cluster with confirmed student details
            if (item.id === targetClusterId) {
              return {
                ...item,
                status: "ASSIGNED",
                assignedStudentId: studentId,
                assignedStudentName: fullName,
                assignedStudentUsn: usn,
              };
            }
            return item;
          });
        });

        // Also update selectedCluster panel if active
        setSelectedCluster(prev => {
          if (!prev) return null;
          if (prev.id === targetClusterId) {
            return {
              ...prev,
              status: "ASSIGNED",
              assignedStudentId: studentId,
              assignedStudentName: fullName,
              assignedStudentUsn: usn,
            };
          }
          if (prev.assignedStudentId === studentId) {
            return {
              ...prev,
              status: "UNASSIGNED",
              assignedStudentId: null,
              assignedStudentName: undefined,
              assignedStudentUsn: undefined,
            };
          }
          return prev;
        });

        setActionSuccessMsg(`Confirmed: Cluster #${targetCluster.clusterNumber} assigned to ${fullName} (${usn})!`);
        setTimeout(() => {
          setAssignModalOpen(false);
          setActionSuccessMsg(null);
        }, 1200);
      } else {
        setActionErrorMsg(res.error || "Failed to complete student assignment.");
      }
    } catch (err: unknown) {
      console.error("Assignment error:", err);
      setActionErrorMsg(err instanceof Error ? err.message : "An error occurred while saving assignment in database.");
    } finally {
      setAssigning(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     6. FILTERED DATA & STATS
  ───────────────────────────────────────────────────────────── */
  const filteredClusters = useMemo(() => {
    return clusters.filter(c => {
      // Status filter
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;

      // Search query (Cluster ID, student name, USN)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const clusterIdStr = `cluster #${c.clusterNumber} ${c.id}`.toLowerCase();
        const studentNameStr = (c.assignedStudentName || "").toLowerCase();
        const studentUsnStr = (c.assignedStudentUsn || "").toLowerCase();
        return (
          clusterIdStr.includes(q) ||
          studentNameStr.includes(q) ||
          studentUsnStr.includes(q)
        );
      }
      return true;
    });
  }, [clusters, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = clusters.length;
    const assigned = clusters.filter(c => c.status === "ASSIGNED").length;
    const unassigned = clusters.filter(c => c.status === "UNASSIGNED").length;
    const totalSamples = clusters.reduce((acc, c) => acc + (c.sampleCount || 0), 0);
    return { total, assigned, unassigned, totalSamples };
  }, [clusters]);

  // Filter students in modal
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 50);
    const q = studentSearch.toLowerCase().trim();
    return students.filter(s => 
      s.fullName.toLowerCase().includes(q) || 
      (s.studentId && s.studentId.toLowerCase().includes(q)) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [students, studentSearch]);

  // Conflict detection for selected student
  const conflictingCluster = useMemo(() => {
    if (!selectedStudent || !targetCluster) return null;
    return clusters.find(
      c => c.assignedStudentId === selectedStudent.id && c.id !== targetCluster.id
    );
  }, [selectedStudent, targetCluster, clusters]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-white min-h-screen">
      
      {/* ─── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <ScanFace className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase">AI Biometric Pipeline</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Identity Candidates & Student Assignment
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review face clusters discovered across lecture sessions. Verify and assign each identity candidate to confirmed student profiles.
          </p>
        </div>

        {/* Session selector & refresh */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {sessions.length > 1 && (
            <select
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                fetchClustersForSession(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:border-cyan-500 focus:outline-none w-full sm:w-auto"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  Session: {s.name} ({s.generatedClusters || 0} clusters)
                </option>
              ))}
            </select>
          )}

          <Button 
            onClick={() => fetchClustersForSession(selectedSessionId)}
            variant="outline"
            className="flex items-center gap-2 bg-slate-900/60 border-slate-700/60 text-slate-300 hover:text-white"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Pipeline Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-l-4 border-l-cyan-500">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Clusters</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold">{stats.total}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold">Candidates</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Unassigned Candidates</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-amber-400">{stats.unassigned}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold">Requires Review</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Confirmed Identities</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-emerald-400">{stats.assigned}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">Assigned</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-indigo-500">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Usable Samples</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-indigo-400">{stats.totalSamples}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold">Crops</span>
          </div>
        </GlassCard>
      </div>

      {/* ─── Search & Filters Bar ──────────────────────────────── */}
      <GlassCard className="p-4 bg-slate-900/40 border-slate-800">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search cluster #, student name, or USN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-xs bg-slate-950/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800 w-full sm:w-auto justify-around overflow-x-auto scrollbar-none">
            {(["ALL", "UNASSIGNED", "ASSIGNED"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider",
                  statusFilter === tab
                    ? "bg-slate-800 text-cyan-400 shadow"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {tab === "ALL" ? "All Clusters" : tab === "UNASSIGNED" ? "Unassigned" : "Assigned"}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* ─── Main Content Grid: Cluster Cards & Detailed Inspector ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left 2 Columns: Candidate Cluster Cards List ── */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3">
              <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-slate-400 text-xs">Loading identity candidates from clustering pipeline...</p>
            </div>
          ) : filteredClusters.length === 0 ? (
            <GlassCard className="p-12 text-center flex flex-col items-center justify-center">
              <Sparkles className="w-10 h-10 text-cyan-400/40 mb-3" />
              <h3 className="text-base font-bold text-slate-200">No Clusters Match Filters</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                No identity candidate matches your search criteria or status filter.
              </p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredClusters.map((cluster) => {
                const isSelected = selectedCluster?.id === cluster.id;
                const isAssigned = cluster.status === "ASSIGNED";
                const displayImageUrl = resolveCropUrl(cluster.bestImageUrl || cluster.bestImagePath);
                const tracksCount = cluster.trackCount ?? Math.max(1, Math.min(cluster.sampleCount, Math.ceil(cluster.sampleCount / 2)));
                const confidencePct = (cluster.confidence ? cluster.confidence * 100 : cluster.qualityAvg || 88).toFixed(1);

                return (
                  <motion.div
                    key={cluster.id}
                    layoutId={`cluster-card-${cluster.id}`}
                    onClick={() => setSelectedCluster(cluster)}
                    className={cn(
                      "group rounded-2xl border transition-all duration-300 p-4 cursor-pointer flex flex-col justify-between",
                      isSelected
                        ? "bg-slate-800/80 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.18)]"
                        : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-850/50"
                    )}
                  >
                    <div>
                      {/* Top Bar: Cluster ID & Status Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-white group-hover:text-cyan-400 transition-colors">
                            Cluster #{cluster.clusterNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({cluster.id.slice(0, 8)}...)
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isAssigned ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Assigned
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                            Unassigned
                          </span>
                        )}
                      </div>

                      {/* Middle: Representative Image & Pipeline Metadata */}
                      <div className="flex gap-3 items-center">
                        {/* Representative Face Image */}
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 shrink-0 shadow-inner">
                          <img
                            src={displayImageUrl}
                            alt={`Cluster #${cluster.clusterNumber}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder-avatar.png";
                            }}
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-black/70 py-0.5 text-[9px] text-center font-bold text-cyan-300">
                            {confidencePct}% Conf
                          </div>
                        </div>

                        {/* Detailed Metrics */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <div className="bg-slate-950/40 px-2 py-1 rounded border border-slate-800">
                              <span className="text-[9px] uppercase text-slate-500 font-semibold block">Tracks</span>
                              <span className="font-bold text-slate-200 flex items-center gap-1">
                                <Film className="w-3 h-3 text-cyan-400" />
                                {tracksCount}
                              </span>
                            </div>
                            <div className="bg-slate-950/40 px-2 py-1 rounded border border-slate-800">
                              <span className="text-[9px] uppercase text-slate-500 font-semibold block">Face Samples</span>
                              <span className="font-bold text-slate-200 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-indigo-400" />
                                {cluster.sampleCount}
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400">
                            <span className="text-[9px] uppercase text-slate-500 font-semibold block">Quality Score</span>
                            <span className="font-semibold text-emerald-400">
                              {cluster.qualityAvg ? `${cluster.qualityAvg.toFixed(1)}%` : "88.5%"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Assigned Student Details on Card */}
                      {isAssigned && cluster.assignedStudentName && (
                        <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{cluster.assignedStudentName}</span>
                          </div>
                          {cluster.assignedStudentUsn && (
                            <p className="text-[10px] text-emerald-400/80 font-mono mt-0.5 pl-5">
                              USN: {cluster.assignedStudentUsn}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action: Assign Student Button */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {cluster.gallery?.length || cluster.imageCount || cluster.sampleCount} crops logged
                      </span>
                      
                      <Button
                        size="sm"
                        onClick={(e) => handleOpenAssign(cluster, e)}
                        className={cn(
                          "text-xs font-semibold flex items-center gap-1.5 h-8 px-3 rounded-lg transition-all",
                          isAssigned
                            ? "bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                            : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 font-bold"
                        )}
                      >
                        {isAssigned ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Reassign
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Assign Student
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right Column: Selected Candidate Deep Inspector ── */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedCluster ? (
              <motion.div
                key={selectedCluster.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="sticky top-6 space-y-4"
              >
                <GlassCard className="overflow-hidden border-slate-800 bg-slate-900/60 p-0">
                  {/* Photo Banner */}
                  <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center border-b border-slate-800">
                    <img
                      src={resolveCropUrl(selectedCluster.bestImageUrl || selectedCluster.bestImagePath)}
                      alt={`Cluster #${selectedCluster.clusterNumber}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder-avatar.png";
                      }}
                    />
                    
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-white border border-slate-700/60">
                      Cluster #{selectedCluster.clusterNumber}
                    </div>

                    <div className="absolute top-3 right-3">
                      {selectedCluster.status === "ASSIGNED" ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Assigned
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          Candidate
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-4 pt-10">
                      {selectedCluster.status === "ASSIGNED" && selectedCluster.assignedStudentName ? (
                        <div>
                          <h3 className="text-lg font-bold text-white leading-tight">
                            {selectedCluster.assignedStudentName}
                          </h3>
                          <p className="text-xs font-mono text-cyan-400 font-semibold mt-0.5">
                            USN: {selectedCluster.assignedStudentUsn || "N/A"}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-bold text-slate-300">
                            Unassigned Identity Candidate
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            No student associated yet with this facial cluster.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inspector Body Details */}
                  <div className="p-5 space-y-4">
                    {/* Metrics Table */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Associated Tracks</span>
                        <span className="text-sm font-bold text-slate-200">
                          {selectedCluster.trackCount || Math.max(1, Math.ceil(selectedCluster.sampleCount / 2))} tracks
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Usable Samples</span>
                        <span className="text-sm font-bold text-indigo-400">
                          {selectedCluster.sampleCount} face crops
                        </span>
                      </div>
                      <div className="border-t border-slate-800/80 pt-2 col-span-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Confidence / Similarity</span>
                        <span className="text-sm font-bold text-cyan-400">
                          {(selectedCluster.confidence ? selectedCluster.confidence * 100 : selectedCluster.qualityAvg || 88).toFixed(1)}%
                        </span>
                      </div>
                      <div className="border-t border-slate-800/80 pt-2 col-span-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Cluster Database ID</span>
                        <span className="text-[10px] font-mono text-slate-400 truncate block">
                          {selectedCluster.id}
                        </span>
                      </div>
                    </div>

                    {/* Cluster Face Gallery Preview */}
                    {selectedCluster.gallery && selectedCluster.gallery.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Extracted Sample Crops ({selectedCluster.gallery.length})
                        </span>
                        <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                          {selectedCluster.gallery.map(img => (
                            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black">
                              <img
                                src={resolveCropUrl(img.imageUrl)}
                                alt="Crop sample"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder-avatar.png";
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Main Action Button */}
                    <Button
                      onClick={() => handleOpenAssign(selectedCluster)}
                      className={cn(
                        "w-full py-2.5 font-bold rounded-xl flex items-center justify-center gap-2",
                        selectedCluster.status === "ASSIGNED"
                          ? "bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
                          : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/25"
                      )}
                    >
                      {selectedCluster.status === "ASSIGNED" ? (
                        <>
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                          Reassign Student
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Assign Student
                        </>
                      )}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <GlassCard className="p-8 text-center text-slate-400 sticky top-6 h-64 flex flex-col items-center justify-center">
                <Eye className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Candidate Selected</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                  Click on any cluster card to inspect tracks and samples.
                </p>
              </GlassCard>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* ─── STUDENT-SELECTION DIALOG (MODAL) ───────────────────── */}
      {assignModalOpen && targetCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-black">
                  <img
                    src={resolveCropUrl(targetCluster.bestImageUrl || targetCluster.bestImagePath)}
                    alt="Target cluster crop"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder-avatar.png";
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Assign Student to Cluster #{targetCluster.clusterNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {targetCluster.sampleCount} usable face samples • {(targetCluster.confidence ? targetCluster.confidence * 100 : 88).toFixed(1)}% confidence
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAssignModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student by name, USN (e.g. 1VI23CS058), or roll number..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Modal Students List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {studentsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  Fetching students registry from PostgreSQL database...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No students found matching &quot;{studentSearch}&quot;.
                </div>
              ) : (
                filteredStudents.map(student => {
                  const isSelected = selectedStudent?.id === student.id;
                  const alreadyAssignedCluster = clusters.find(
                    c => c.assignedStudentId === student.id && c.id !== targetCluster.id
                  );

                  return (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                          : "bg-slate-950/40 border-slate-850 hover:border-slate-700 hover:bg-slate-900/60"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0",
                          isSelected ? "bg-cyan-500 text-black" : "bg-slate-800 text-slate-300"
                        )}>
                          {student.fullName.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <h4 className={cn("text-xs font-bold truncate", isSelected ? "text-cyan-300" : "text-white")}>
                            {student.fullName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="font-mono text-cyan-400">{student.studentId || student.rollNumber}</span>
                            <span>•</span>
                            <span>Sec {student.section || "A"}</span>
                            {student.department?.code && (
                              <>
                                <span>•</span>
                                <span>{student.department.code}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Conflict / Status Flag */}
                      <div className="flex items-center gap-2 shrink-0">
                        {alreadyAssignedCluster && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
                            Assigned to #{alreadyAssignedCluster.clusterNumber}
                          </span>
                        )}

                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-cyan-500 border-cyan-500 text-black"
                            : "border-slate-700 text-transparent"
                        )}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Conflict Warning Alert */}
            {conflictingCluster && selectedStudent && (
              <div className="mx-4 mb-2 p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-300">Conflict Prevention Triggered</p>
                  <p className="text-[11px] text-amber-400/90 leading-relaxed">
                    Student <span className="font-bold">{selectedStudent.fullName}</span> is currently assigned to <span className="font-bold">Cluster #{conflictingCluster.clusterNumber}</span>. Confirming will safely unassign Cluster #{conflictingCluster.clusterNumber} and associate their identity with Cluster #{targetCluster.clusterNumber}.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {actionErrorMsg && (
              <div className="mx-4 mb-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {actionErrorMsg}
              </div>
            )}

            {/* Success Message */}
            {actionSuccessMsg && (
              <div className="mx-4 mb-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {actionSuccessMsg}
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {selectedStudent ? (
                  <span>Selected: <strong className="text-white">{selectedStudent.fullName}</strong></span>
                ) : (
                  "Select a student from the list above"
                )}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAssignModalOpen(false)}
                  disabled={assigning}
                  className="bg-slate-900 border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={handleConfirmAssignment}
                  disabled={!selectedStudent || assigning}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/25"
                >
                  {assigning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Saving in PostgreSQL...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Confirm Assignment
                    </>
                  )}
                </Button>
              </div>
            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
}
