"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { isDemoMode } from "@/lib/demo-mode";
import { api } from "@/lib/api/client";
import { 
  ScanFace, Sparkles, RefreshCw, Check, X, Search, 
  Calendar, Sliders, Eye, CheckCircle2, XCircle, Clock, Info
} from "lucide-react";

interface LearningCandidate {
  id: number;
  student_id: number;
  student_name: string;
  usn: string;
  image_path: string;
  quality_score: number;
  similarity_score: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

interface Stats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

const MOCK_STATS: Stats = {
  total: 42,
  approved: 18,
  rejected: 5,
  pending: 19
};

const MOCK_CANDIDATES: LearningCandidate[] = [
  {
    id: 1,
    student_id: 101,
    student_name: "Rahul Sharma",
    usn: "1MS21CS084",
    image_path: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    quality_score: 91.2,
    similarity_score: 0.992,
    status: "PENDING",
    created_at: new Date(Date.now() - 600000).toISOString()
  },
  {
    id: 2,
    student_id: 102,
    student_name: "Sneha Reddy",
    usn: "1MS21CS112",
    image_path: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    quality_score: 88.5,
    similarity_score: 0.987,
    status: "PENDING",
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 3,
    student_id: 103,
    student_name: "Abhishek Gowda",
    usn: "1MS21CS004",
    image_path: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    quality_score: 93.8,
    similarity_score: 0.995,
    status: "APPROVED",
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 4,
    student_id: 104,
    student_name: "Meera Nair",
    usn: "1MS21CS056",
    image_path: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    quality_score: 86.4,
    similarity_score: 0.982,
    status: "PENDING",
    created_at: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: 5,
    student_id: 105,
    student_name: "Vikram Malhotra",
    usn: "1MS21CS145",
    image_path: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    quality_score: 87.1,
    similarity_score: 0.981,
    status: "REJECTED",
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];

export default function ContinuousLearningDashboard() {
  const [candidates, setCandidates] = useState<LearningCandidate[]>([]);
  const [stats, setStats] = useState<Stats>(MOCK_STATS);
  const [selectedCandidate, setSelectedCandidate] = useState<LearningCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // Filtering & Pagination
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 8;

  const fetchData = async () => {
    setLoading(true);
    if (isDemoMode()) {
      // Simulate API call
      setTimeout(() => {
        let filtered = [...MOCK_CANDIDATES];
        if (statusFilter !== "ALL") {
          filtered = filtered.filter(c => c.status === statusFilter);
        }
        if (searchQuery) {
          const lower = searchQuery.toLowerCase();
          filtered = filtered.filter(c => 
            c.student_name.toLowerCase().includes(lower) || 
            c.usn.toLowerCase().includes(lower)
          );
        }
        setCandidates(filtered);
        setStats(MOCK_STATS);
        setTotalPages(Math.ceil(filtered.length / limit) || 1);
        if (filtered.length > 0 && !selectedCandidate) {
          setSelectedCandidate(filtered[0]);
        }
        setLoading(false);
      }, 500);
      return;
    }

    try {
      // Fetch stats
      const statsRes = await api.get<{ data: Stats }>("/learning/candidates/stats");
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data.data);
      }

      // Fetch candidates
      const statusParam = statusFilter === "ALL" ? "" : statusFilter;
      const res = await api.get<{ data: LearningCandidate[]; total: number; total_pages: number }>(
        `/learning/candidates?page=${page}&limit=${limit}&status=${statusParam}&search=${encodeURIComponent(searchQuery)}`
      );

      if (res.success && res.data) {
        const items: LearningCandidate[] = Array.isArray(res.data) ? res.data : ((res.data as any).data || []);
        setCandidates(items);
        setTotalPages((res.data as any).total_pages || 1);
        
        // Auto select first item if none is selected
        if (items.length > 0) {
          // If previous selected still exists in list, keep it, otherwise select first
          const stillExists = items.find(i => i.id === selectedCandidate?.id);
          if (!stillExists) {
            setSelectedCandidate(items[0]);
          } else {
            setSelectedCandidate(stillExists);
          }
        } else {
          setSelectedCandidate(null);
        }
      }
    } catch (err) {
      console.error("Error fetching continuous learning candidates:", err);
      // Fallback to mocks in case of server failure
      setCandidates(MOCK_CANDIDATES);
      setStats(MOCK_STATS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, searchQuery, page]);

  const handleAction = async (id: number, type: "approve" | "reject") => {
    setActionLoading(id);
    if (isDemoMode()) {
      setTimeout(() => {
        // Update stats mock
        setStats(prev => {
          const updated = { ...prev };
          const cand = candidates.find(c => c.id === id);
          if (cand && cand.status === "PENDING") {
            updated.pending = Math.max(0, updated.pending - 1);
            if (type === "approve") updated.approved += 1;
            else updated.rejected += 1;
          }
          return updated;
        });

        // Update list
        setCandidates(prev => 
          prev.map(c => c.id === id ? { ...c, status: type === "approve" ? "APPROVED" : "REJECTED" } : c)
        );

        // Update selected detail
        if (selectedCandidate?.id === id) {
          setSelectedCandidate(prev => prev ? { ...prev, status: type === "approve" ? "APPROVED" : "REJECTED" } : null);
        }

        setActionLoading(null);
      }, 500);
      return;
    }

    try {
      const res = await api.post<{ success: boolean }>(`/learning/candidates/${id}/${type}`);
      if (res.success) {
        // Refresh local stats
        const statsRes = await api.get<{ data: Stats }>("/learning/candidates/stats");
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data.data);
        }
        
        // Update item status locally to avoid full list reload and layout jank
        setCandidates(prev => 
          prev.map(c => c.id === id ? { ...c, status: type === "approve" ? "APPROVED" : "REJECTED" } : c)
        );
        if (selectedCandidate?.id === id) {
          setSelectedCandidate(prev => prev ? { ...prev, status: type === "approve" ? "APPROVED" : "REJECTED" } : null);
        }
      }
    } catch (err) {
      console.error(`Error performing action ${type} on candidate ${id}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-ai-blue mb-1">
            <ScanFace className="w-6 h-6 text-ai-blue animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-cyan-400">ML Pipeline Controls</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Continuous Learning Queue
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review and approve high-fidelity facial crops to improve student matching models.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={fetchData}
            variant="outline"
            className="flex items-center gap-2 bg-slate-900/60 border-slate-700/60 text-slate-300 hover:text-white"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex flex-col justify-between border-l-4 border-l-cyan-500 hover:scale-[1.01] transition-transform duration-300">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Candidates</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold tracking-tight">{stats.total}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold">Queue</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between border-l-4 border-l-amber-500 hover:scale-[1.01] transition-transform duration-300">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pending Review</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold tracking-tight text-amber-400">{stats.pending}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold">Awaiting</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 hover:scale-[1.01] transition-transform duration-300">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Approved Samples</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-400">{stats.approved}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">Ready</span>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between border-l-4 border-l-rose-500 hover:scale-[1.01] transition-transform duration-300">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Rejected Crops</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold tracking-tight text-rose-400">{stats.rejected}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold">Excluded</span>
          </div>
        </GlassCard>
      </div>

      {/* Main Grid: Filters & Lists & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Filter bar & Candidate list */}
        <div className="lg:col-span-2 space-y-4">
          <GlassCard className="p-4 bg-slate-900/40 border-slate-800/80 backdrop-blur-md">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or USN..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 pr-4 py-2 w-full text-sm bg-slate-950/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Status Tab buttons */}
              <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800 w-full sm:w-auto justify-around">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setStatusFilter(tab);
                      setPage(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 uppercase",
                      statusFilter === tab
                        ? "bg-slate-800 text-cyan-400 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {tab.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* List display */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500/20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-t-cyan-400 rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-400 text-sm">Loading candidates queue...</p>
            </div>
          ) : candidates.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center p-12 text-center h-96">
              <div className="w-16 h-16 rounded-full bg-slate-800/40 flex items-center justify-center border border-slate-700/40 mb-4">
                <Sparkles className="w-8 h-8 text-cyan-400/60" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">Continuous Queue Empty</h3>
              <p className="text-slate-400 text-sm max-w-sm mt-2">
                No face candidates match the filters or have been logged yet. Only recognized faces with Confidence &gt; 98% and Quality &gt; 85 are queued.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((cand) => (
                  <motion.div
                    key={cand.id}
                    layoutId={`card-container-${cand.id}`}
                    onClick={() => setSelectedCandidate(cand)}
                    className={cn(
                      "group cursor-pointer rounded-xl overflow-hidden border transition-all duration-300",
                      selectedCandidate?.id === cand.id
                        ? "bg-slate-800/65 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "bg-slate-900/35 border-slate-800 hover:border-slate-700/80 hover:bg-slate-800/30"
                    )}
                  >
                    <div className="p-4 flex gap-4 items-center">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 flex-shrink-0">
                        <img
                          src={cand.image_path}
                          alt={cand.student_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder-avatar.png";
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-100 truncate group-hover:text-cyan-400 transition-colors">
                            {cand.student_name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 tracking-wider truncate mb-1">
                          USN: {cand.usn}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs mt-2">
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mr-1">Quality:</span>
                            <span className={cn(
                              "font-semibold",
                              cand.quality_score > 90 ? "text-emerald-400" : "text-cyan-400"
                            )}>{cand.quality_score}%</span>
                          </div>
                          <div className="h-3 w-px bg-slate-800"></div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mr-1">Similarity:</span>
                            <span className="text-slate-300 font-semibold">{cand.similarity_score}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end justify-between self-stretch">
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(cand.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="scale-90 transform origin-right">
                          {getStatusBadge(cand.status)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    className="h-8 px-3 text-xs bg-slate-900 border-slate-850 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-400">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                    className="h-8 px-3 text-xs bg-slate-900 border-slate-850 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Selected Candidate Details & Review Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedCandidate ? (
              <motion.div
                key={selectedCandidate.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="sticky top-6"
              >
                <GlassCard className="overflow-hidden border-slate-800/80 bg-slate-900/50">
                  {/* Photo area */}
                  <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center border-b border-slate-800/80">
                    <img
                      src={selectedCandidate.image_path}
                      alt={selectedCandidate.student_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder-avatar.png";
                      }}
                    />
                    
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(selectedCandidate.status)}
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-4 pt-10">
                      <h3 className="text-xl font-bold text-slate-100">{selectedCandidate.student_name}</h3>
                      <p className="text-xs text-cyan-400 font-semibold tracking-wider uppercase mt-0.5">{selectedCandidate.usn}</p>
                    </div>
                  </div>

                  {/* Metadata Table */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Quality Score</span>
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            selectedCandidate.quality_score > 90 ? "bg-emerald-400" : "bg-cyan-400"
                          )}></div>
                          <span className="text-sm font-bold text-slate-200">{selectedCandidate.quality_score}%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Similarity Confidence</span>
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-sm font-bold text-slate-200">{selectedCandidate.similarity_score}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1 col-span-2 border-t border-slate-800/80 pt-2 mt-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Capture Time</span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(selectedCandidate.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pipeline Info Box */}
                    <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-800/30 flex gap-3 text-xs text-slate-300">
                      <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold text-cyan-300 block">Candidate Retraining Model</span>
                        <span>Approved samples will be incorporated during the next weekly optimizer run to refine face embeddings and reduce matching errors.</span>
                      </div>
                    </div>

                    {/* Review actions */}
                    {selectedCandidate.status === "PENDING" && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button
                          onClick={() => handleAction(selectedCandidate.id, "reject")}
                          disabled={actionLoading !== null}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 font-semibold"
                        >
                          {actionLoading === selectedCandidate.id ? (
                            <div className="w-4 h-4 border-2 border-t-rose-400 rounded-full animate-spin"></div>
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Reject Crop
                        </Button>
                        <Button
                          onClick={() => handleAction(selectedCandidate.id, "approve")}
                          disabled={actionLoading !== null}
                          className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 font-semibold"
                        >
                          {actionLoading === selectedCandidate.id ? (
                            <div className="w-4 h-4 border-2 border-t-emerald-400 rounded-full animate-spin"></div>
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Approve Face
                        </Button>
                      </div>
                    )}

                    {selectedCandidate.status !== "PENDING" && (
                      <div className="text-center p-3 rounded-lg border border-dashed border-slate-800 text-xs text-slate-400 italic">
                        Decision logged. You can review other candidates.
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <GlassCard className="p-8 text-center bg-slate-900/20 border-slate-850 text-slate-400 sticky top-6 h-64 flex flex-col items-center justify-center">
                <Eye className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Candidate Selected</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                  Select a face candidate from the queue list to inspect and verify metrics.
                </p>
              </GlassCard>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
