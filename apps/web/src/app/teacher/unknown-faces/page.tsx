"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { isDemoMode } from "@/lib/demo-mode";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";
import { 
  ScanFace, AlertCircle, ShieldAlert, Sparkles, RefreshCw, 
  Trash2, UserPlus, Check, Search, Calendar, Sliders, ChevronRight
} from "lucide-react";

interface UnknownCluster {
  id?: number;
  cluster_id: string;
  images_count?: number;
  average_quality: number;
  quality_score?: number;
  preview_image: string;
  image_path?: string;
  detected_at: string;
  first_seen?: string;
  created_at?: string;
  camera_id?: string;
  is_resolved?: boolean;
  status?: string;
  suggested_match: {
    usn: string;
    name: string;
    confidence: number;
  } | null;
}

const MOCK_CLUSTERS: UnknownCluster[] = [
  {
    id: 1,
    cluster_id: "unknown_3a5b2c",
    average_quality: 78.4,
    quality_score: 78.4,
    preview_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    detected_at: new Date(Date.now() - 3600000).toISOString(),
    camera_id: "CAM-01",
    is_resolved: false,
    status: "Unresolved",
    suggested_match: {
      usn: "CSE2026002",
      name: "Priya Patel",
      confidence: 84.5
    }
  },
  {
    id: 2,
    cluster_id: "unknown_f8e4d2",
    average_quality: 72.1,
    quality_score: 72.1,
    preview_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    detected_at: new Date(Date.now() - 7200000).toISOString(),
    camera_id: "CAM-02",
    is_resolved: false,
    status: "Unresolved",
    suggested_match: null
  },
  {
    id: 3,
    cluster_id: "unknown_c1b9a8",
    average_quality: 81.3,
    quality_score: 81.3,
    preview_image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    detected_at: new Date(Date.now() - 14400000).toISOString(),
    camera_id: "CAM-01",
    is_resolved: false,
    status: "Unresolved",
    suggested_match: {
      usn: "CSE2026005",
      name: "Vikram Singh",
      confidence: 76.2
    }
  }
];

export default function UnknownFacesDashboard() {
  const [clusters, setClusters] = useState<UnknownCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<UnknownCluster | null>(null);
  const [clusterDetails, setClusterDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"review" | "optimizer">("review");

  // Pagination states (client-side for clusters)
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Modals state
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  
  // Form values
  const [enrollForm, setEnrollForm] = useState({ name: "", usn: "", department: "Computer Science", semester: 1, section: "A" });
  const [visitorName, setVisitorName] = useState("");
  const [alertLocation, setAlertLocation] = useState("Main Seminar Hall");
  
  // Optimizer state
  const [optimizing, setOptimizing] = useState(false);
  const [optimizerLogs, setOptimizerLogs] = useState<string[]>([]);
  const [rollbackUsn, setRollbackUsn] = useState("");
  const [rollbackVersion, setRollbackVersion] = useState(1);
  const [rollbackStatus, setRollbackStatus] = useState<string | null>(null);

  const fetchClusters = async () => {
    setLoading(true);
    try {
      const res = await api.get<UnknownCluster[]>("/clusters");
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : ((res.data as any).data || []);
        // Map fields to guarantee backward compatibility
        const mappedItems = items.map((item: any) => ({
          ...item,
          preview_image: item.representative_image || item.preview_image || "/placeholder-avatar.png",
          detected_at: item.last_seen || item.detected_at || new Date().toISOString(),
          average_quality: item.quality ?? item.average_quality ?? 0,
          images_count: item.appearance_count ?? item.images_count ?? 1,
        }));
        setClusters(mappedItems);
        if (mappedItems.length > 0) {
          handleSelectCluster(mappedItems[0]);
        } else {
          setSelectedCluster(null);
          setClusterDetails(null);
        }
      } else {
        setClusters([]);
        setSelectedCluster(null);
        setClusterDetails(null);
      }
    } catch (err) {
      console.error("Error fetching clusters:", err);
      setClusters([]);
      setSelectedCluster(null);
      setClusterDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCluster = async (cluster: UnknownCluster) => {
    setSelectedCluster(cluster);
    setClusterDetails(null);
    if (isDemoMode()) {
      return;
    }
    setDetailsLoading(true);
    try {
      const res = await api.get<any>(`/clusters/${cluster.cluster_id}`);
      if (res.success && res.data) {
        setClusterDetails(res.data);
      }
    } catch (err) {
      console.error("Error fetching cluster details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  const handleApproveMatch = async () => {
    if (!selectedCluster || !selectedCluster.suggested_match) return;
    const match = selectedCluster.suggested_match;
    
    setLoading(true);
    if (isDemoMode()) {
      setClusters((prev) => prev.filter((c) => c.cluster_id !== selectedCluster.cluster_id));
      setSelectedCluster(null);
      setLoading(false);
      alert(`Successfully merged cluster ${selectedCluster.cluster_id} into student profile of ${match.name}`);
      return;
    }

    try {
      const res = await api.post<any>("/attendance/unknown-faces/enroll", {
        cluster_id: selectedCluster.cluster_id,
        name: match.name,
        usn: match.usn,
        department: "Computer Science",
        semester: 1,
        section: "A"
      });
      if (res.success) {
        setClusters((prev) => prev.filter((c) => c.cluster_id !== selectedCluster.cluster_id));
        setSelectedCluster(null);
        setClusterDetails(null);
        alert("Match successfully approved and profile updated!");
      }
    } catch (err: any) {
      alert(`Error approving match: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCluster) return;

    setLoading(true);
    setEnrollModalOpen(false);

    if (isDemoMode()) {
      setClusters((prev) => prev.filter((c) => c.cluster_id !== selectedCluster.cluster_id));
      setSelectedCluster(null);
      setLoading(false);
      alert(`Enrolled student ${enrollForm.name} (${enrollForm.usn}) successfully!`);
      return;
    }

    try {
      const res = await api.post<any>("/attendance/unknown-faces/enroll", {
        cluster_id: selectedCluster.cluster_id,
        name: enrollForm.name,
        usn: enrollForm.usn,
        department: enrollForm.department,
        semester: Number(enrollForm.semester),
        section: enrollForm.section
      });
      if (res.success) {
        setClusters((prev) => prev.filter((c) => c.cluster_id !== selectedCluster.cluster_id));
        setSelectedCluster(null);
        setClusterDetails(null);
        alert("Student profile created successfully!");
      }
    } catch (err: any) {
      alert(`Error enrolling student: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCluster) return;

    setLoading(true);
    setVisitorModalOpen(false);

    if (isDemoMode()) {
      setClusters((prev) => prev.filter((c) => c.cluster_id !== selectedCluster.cluster_id));
      setSelectedCluster(null);
      setLoading(false);
      alert(`Cluster labeled as visitor: ${visitorName}`);
      return;
    }

    try {
      const res = await api.post<any>("/attendance/unknown-faces/visitor", {
        cluster_id: selectedCluster.cluster_id,
        visitor_name: visitorName
      });
      if (res.success) {
        setClusters((prev) => prev.filter((c) => c.cluster_id !== selectedCluster.cluster_id));
        setSelectedCluster(null);
        setClusterDetails(null);
        alert("Cluster labeled as visitor.");
      }
    } catch (err: any) {
      alert(`Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCluster = async () => {
    if (!selectedCluster) return;
    if (!confirm(`Are you sure you want to delete cluster ${selectedCluster.cluster_id} and all its detections?`)) return;

    setLoading(true);
    if (isDemoMode()) {
      setClusters((prev) => prev.filter((c) => c.cluster_id !== selectedCluster.cluster_id));
      setSelectedCluster(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.delete<any>(`/clusters/${selectedCluster.cluster_id}`);
      if (res.success) {
        alert("Cluster and all its detections deleted successfully.");
        setSelectedCluster(null);
        setClusterDetails(null);
        await fetchClusters();
      }
    } catch (err: any) {
      alert(`Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCluster) return;

    setLoading(true);
    setAlertModalOpen(false);

    if (isDemoMode()) {
      setLoading(false);
      alert(`Security alert triggered for location ${alertLocation}`);
      return;
    }

    try {
      const res = await api.post<any>("/attendance/unknown-faces/alert", {
        cluster_id: selectedCluster.cluster_id,
        location: alertLocation
      });
      if (res.success) {
        alert(`Security alert broadcasted successfully for cluster at ${alertLocation}.`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunOptimizer = async () => {
    setOptimizing(true);
    setOptimizerLogs(["Initializing consolidation pass...", "Gathering candidate face images..."]);
    
    if (isDemoMode()) {
      setTimeout(() => setOptimizerLogs((prev) => [...prev, "Analyzing candidate face images...", "Filtering low-clarity samples..."]), 1000);
      setTimeout(() => setOptimizerLogs((prev) => [...prev, "Consolidating facial profiles...", "Recalibrating verification templates..."]), 2000);
      setTimeout(() => {
        setOptimizerLogs((prev) => [...prev, "Biometric directory index successfully synchronized.", "Optimization report generated successfully."]);
        setOptimizing(false);
        alert("Face Profile Optimization completed successfully!");
      }, 3500);
      return;
    }

    try {
      const res = await api.post<any>("/attendance/optimizer/run");
      if (res.success && res.data) {
        const report = res.data.report || res.data;
        setOptimizerLogs([
          `Consolidation completed at ${report.timestamp || new Date().toLocaleTimeString()}`,
          `Students Updated: ${report.students_updated ?? 0}`,
          `New samples consolidated: ${report.new_samples_added ?? 0}`,
          "Biometric directory index successfully synchronized.",
        ]);
        alert("Face Profile Optimization completed successfully!");
      }
    } catch (err: any) {
      setOptimizerLogs((prev) => [...prev, `Error: ${err.message || err}`]);
      alert(`Optimization run failed: ${err.message || err}`);
    } finally {
      setOptimizing(false);
    }
  };

  const handleRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollbackUsn) return;
    setRollbackStatus("Processing rollback request...");

    if (isDemoMode()) {
      setTimeout(() => {
        setRollbackStatus(`Rollback successful: Student '${rollbackUsn}' reverted to Version ${rollbackVersion}`);
        alert(`Student profile rolled back to Version ${rollbackVersion} successfully (Demo Mode)!`);
      }, 1000);
      return;
    }

    try {
      const res = await api.post<any>("/attendance/optimizer/rollback", {
        usn: rollbackUsn,
        version: Number(rollbackVersion),
      });
      if (res.success) {
        setRollbackStatus(`Success: Active face profile for student '${rollbackUsn}' rolled back to Version ${rollbackVersion}.`);
        alert("Rollback executed successfully!");
      }
    } catch (err: any) {
      setRollbackStatus(`Rollback failed: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <ScanFace className="w-6 h-6 text-ai-blue" />
            Unknown Face Review Center
          </h2>
          <p className="text-xs text-text-muted">Review, label, and optimize unassigned facial detections</p>
        </div>

        {/* Tab Controls (Bypassed) */}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "review" ? (
          <motion.div 
            key="review-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* List Section */}
            <div className="lg:col-span-2 space-y-4">
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">Unassigned Unknown Face Detections</h3>
                  <Button size="sm" variant="secondary" onClick={() => fetchClusters()} className="flex items-center gap-1.5 text-[10px]">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </Button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="h-5 w-5 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : clusters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted">
                    <Check className="w-8 h-8 text-success mb-2" />
                    <p className="text-xs">No unrecognized face detections require review.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {clusters.map((c) => (
                        <div
                          key={c.cluster_id}
                          onClick={() => handleSelectCluster(c)}
                          className={cn(
                            "flex gap-3 p-3 rounded-xl border cursor-pointer hover:bg-glass-medium transition-all",
                            selectedCluster?.cluster_id === c.cluster_id
                              ? "bg-glass-heavy border-ai-blue shadow-glass"
                              : "bg-glass-light border-glass-border"
                          )}
                        >
                          <img
                            src={c.preview_image}
                            alt="Unknown face crop"
                            className="w-16 h-16 rounded-lg object-cover bg-bg-secondary shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[11px] font-mono text-text-primary truncate">{c.cluster_id}</span>
                              <span className="px-1.5 py-0.5 rounded bg-ai-purple/15 text-ai-purple text-[9px] font-semibold shrink-0">
                                {c.images_count} occurrences
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted">Last Seen: {c.detected_at ? new Date(c.detected_at).toLocaleString() : "Unknown"}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-text-muted">Quality:</span>
                              <span className={cn(
                                "text-[10px] font-bold",
                                c.average_quality >= 75 ? "text-success" : "text-warning"
                              )}>
                                {c.average_quality}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Selected Panel Detail Section */}
            <div className="space-y-4">
              {selectedCluster ? (
                <GlassCard className="space-y-4">
                  <div className="text-center space-y-2">
                    <img
                      src={selectedCluster.preview_image}
                      alt="Full Face Crop preview"
                      className="w-32 h-32 rounded-xl object-cover bg-bg-secondary mx-auto shadow-glass"
                    />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-mono text-text-primary">{selectedCluster.cluster_id}</h4>
                      <p className="text-[10px] text-text-muted">Last Seen: {new Date(selectedCluster.detected_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Detection Metadata */}
                  <div className="p-3.5 rounded-xl bg-glass-light border border-glass-border space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-text-muted">First Seen:</span>
                      <span className="font-semibold text-text-primary">
                        {selectedCluster.first_seen ? new Date(selectedCluster.first_seen).toLocaleString() : "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Last Seen:</span>
                      <span className="font-semibold text-text-primary">
                        {selectedCluster.detected_at ? new Date(selectedCluster.detected_at).toLocaleString() : "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Appearance Count:</span>
                      <span className="font-semibold text-text-primary">{selectedCluster.images_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Quality Score:</span>
                      <span className="font-semibold text-text-primary">{selectedCluster.average_quality}%</span>
                    </div>
                  </div>

                  {/* Cluster Gallery */}
                  {detailsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : clusterDetails?.faces && (
                    <div className="space-y-2 pt-2 border-t border-glass-border">
                      <h4 className="text-[10px] font-semibold text-text-primary uppercase tracking-wider">Cluster Gallery</h4>
                      <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                        {clusterDetails.faces.map((face: any) => (
                          <div key={face.id} className="relative rounded overflow-hidden border border-glass-border bg-glass-light">
                            <img
                              src={face.image_path}
                              alt="Crop"
                              className="w-full h-12 object-cover"
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center font-semibold text-text-primary">
                              {face.quality_score}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Commands */}
                  <div className="space-y-2 pt-2 border-t border-glass-border">
                    <Button size="sm" onClick={() => setEnrollModalOpen(true)} className="w-full flex items-center justify-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Enroll Student
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleDeleteCluster} className="w-full flex items-center justify-center gap-2 text-error hover:bg-error/10">
                      <Trash2 className="w-4 h-4 text-error" />
                      Delete Cluster
                    </Button>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="flex items-center justify-center h-64 text-center text-text-muted text-xs">
                  Select a face crop on the left to review details and take actions.
                </GlassCard>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="optimizer-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Optimizer controls */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-ai-purple" />
                    Continuous Learning Optimizer
                  </h3>
                  <p className="text-[11px] text-text-muted mt-1">
                    Triggers the consolidation process to aggregate high-quality attendance captures, rebuild embeddings, and update model indexes automatically.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleRunOptimizer}
                    disabled={optimizing}
                    className="flex items-center gap-2 font-bold bg-gradient-to-r from-ai-blue to-ai-purple text-black"
                  >
                    <RefreshCw className={cn("w-4 h-4", optimizing && "animate-spin")} />
                    {optimizing ? "Running Optimization..." : "Consolidate Candidate Samples (Run Optimizer)"}
                  </Button>
                </div>

                {/* Console Log */}
                {optimizerLogs.length > 0 && (
                  <div className="p-4 rounded-xl bg-black border border-glass-border font-mono text-[10px] text-emerald-400 space-y-1.5 max-h-48 overflow-y-auto">
                    {optimizerLogs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-text-muted">[{new Date().toLocaleTimeString()}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Profile Rollback controller */}
            <div>
              <GlassCard className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Sliders className="w-4.5 h-4.5 text-ai-blue" />
                    Restore Profile Version
                  </h3>
                  <p className="text-[10px] text-text-muted">
                    Roll back a student's active face profile back to a previous verified version.
                  </p>
                </div>

                <form onSubmit={handleRollback} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Student USN</label>
                    <input
                      type="text"
                      placeholder="e.g. CSE2026002"
                      value={rollbackUsn}
                      onChange={(e) => setRollbackUsn(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary placeholder:text-text-dim"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">Target Version</label>
                    <select
                      value={rollbackVersion}
                      onChange={(e) => setRollbackVersion(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary"
                    >
                      <option value={1}>Version 1 (Initial Setup)</option>
                      <option value={2}>Version 2</option>
                      <option value={3}>Version 3</option>
                      <option value={4}>Version 4</option>
                    </select>
                  </div>

                  <Button type="submit" variant="secondary" className="w-full text-xs">
                    Revert Active Profile
                  </Button>
                </form>

                {rollbackStatus && (
                  <div className="p-3 rounded-lg border border-glass-border bg-glass-light text-[10px] text-text-secondary leading-normal">
                    {rollbackStatus}
                  </div>
                )}
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: ENROLL NEW STUDENT */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-md glass border border-glass-border rounded-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Enroll As New Student</h3>
              <button onClick={() => setEnrollModalOpen(false)} className="text-text-muted hover:text-text-primary text-xs">✕</button>
            </div>

            <form onSubmit={handleEnrollNew} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-text-muted">Student Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={enrollForm.name}
                  onChange={(e) => setEnrollForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-text-muted">USN / ID</label>
                <input
                  type="text"
                  placeholder="USN"
                  value={enrollForm.usn}
                  onChange={(e) => setEnrollForm((prev) => ({ ...prev, usn: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-text-muted">Department</label>
                <input
                  type="text"
                  value={enrollForm.department}
                  onChange={(e) => setEnrollForm((prev) => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-text-muted">Semester</label>
                  <select
                    value={enrollForm.semester}
                    onChange={(e) => setEnrollForm((prev) => ({ ...prev, semester: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-text-muted">Section</label>
                  <input
                    type="text"
                    value={enrollForm.section}
                    onChange={(e) => setEnrollForm((prev) => ({ ...prev, section: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="secondary" type="button" onClick={() => setEnrollModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Enroll Face Profile
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: MARK VISITOR */}
      {visitorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm glass border border-glass-border rounded-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Label As Visitor</h3>
              <button onClick={() => setVisitorModalOpen(false)} className="text-text-muted hover:text-text-primary text-xs">✕</button>
            </div>

            <form onSubmit={handleMarkVisitor} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-text-muted">Visitor Name / Label</label>
                <input
                  type="text"
                  placeholder="Visitor Name"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="secondary" type="button" onClick={() => setVisitorModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Save Visitor
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: SECURITY ALERT */}
      {alertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm glass border border-glass-border rounded-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between text-warning">
              <h3 className="text-sm font-bold text-warning flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Trigger Intruder Alert
              </h3>
              <button onClick={() => setAlertModalOpen(false)} className="text-text-muted hover:text-text-primary text-xs">✕</button>
            </div>

            <form onSubmit={handleTriggerAlert} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-text-muted">Detection Location</label>
                <input
                  type="text"
                  placeholder="Classroom or Gate"
                  value={alertLocation}
                  onChange={(e) => setAlertLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass border border-glass-border text-xs text-text-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="secondary" type="button" onClick={() => setAlertModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" className="bg-warning text-black">
                  Trigger Alert
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
