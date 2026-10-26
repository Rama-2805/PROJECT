"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { type Department } from "@/lib/mock/departments";
import { api } from "@/lib/api/client";
import { X, Plus, Search, Building2, User, FileText, CheckCircle2, ShieldAlert, Trash2 } from "lucide-react";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addHodName, setAddHodName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Details Modal State
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    let loaded: Department[] = [];

    try {
      const res = await api.get<any[]>("/departments");
      if (res.success && Array.isArray(res.data)) {
        loaded = res.data
          .filter((d: any) => {
            // Exclude automated test artifacts
            const c = (d.code || "").trim();
            return !c.includes("_1792") && !c.includes("e2e");
          })
          .map((d: any) => {
            const code = (d.code || "DEPT").trim().toUpperCase();
            return {
              id: d.id,
              name: d.name,
              code: code,
              hodName: d.hodName || "Not Assigned",
              description: d.description || "Academic department registered in the institution.",
              studentCount: d._count?.students ?? 0,
              teacherCount: d._count?.teachers ?? 0,
              classroomCount: d._count?.classrooms ?? 0,
              courseCount: d._count?.courses ?? 0,
              isActive: d.isActive ?? true,
            };
          });
      }
    } catch (err) {
      console.warn("Failed to fetch departments from backend:", err);
    }

    setDepartments(loaded);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    const name = addName.trim();
    const code = addCode.trim().toUpperCase();
    const hod = addHodName.trim();
    const description = addDescription.trim();

    if (!name) {
      setAddError("Department name is required.");
      return;
    }

    if (!code || code.length < 2 || code.length > 8) {
      setAddError("Department code must be between 2 and 8 uppercase characters (e.g. CSE, AIML).");
      return;
    }

    // Check duplicate code in current departments
    if (departments.some((d) => d.code.toUpperCase() === code)) {
      setAddError(`A department with code "${code}" already exists.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Persist to Backend PostgreSQL Database
      const res = await api.post<any>("/departments", {
        name,
        code,
        hodName: hod || undefined,
        description: description || undefined,
      });

      if (!res.success && res.error) {
        throw new Error(res.error);
      }

      setAddSuccess(`Department "${name}" (${code}) created successfully!`);
      setAddName("");
      setAddCode("");
      setAddHodName("");
      setAddDescription("");

      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess(null);
        loadData();
      }, 1000);
    } catch (err: any) {
      setAddError(err?.message || "Failed to create department. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (dept: Department) => {
    if (!confirm(`Are you sure you want to delete the department "${dept.name}" (${dept.code})?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await api.delete(`/departments/${dept.id}`);
      if (!res.success && res.error) {
        alert(res.error);
        return;
      }
      setSelectedDept(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete department");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = departments.filter((d) => {
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.hodName.toLowerCase().includes(q);
  });

  // Calculate totals strictly from real database counts
  const totalStudents = departments.reduce((sum, d) => sum + (d.studentCount || 0), 0);
  const totalTeachers = departments.reduce((sum, d) => sum + (d.teacherCount || 0), 0);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Department Management</h2>
          <p className="text-xs text-text-muted">Manage academic departments across the institution</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => {
            setAddError(null);
            setAddSuccess(null);
            setIsAddModalOpen(true);
          }}
          className="self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Department
        </Button>
      </div>

      {/* Stats - 100% Real Database Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <GlassCard subtle className="p-4">
          <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wider font-semibold">Total Departments</p>
          <p className="text-2xl font-bold text-text-primary">{departments.length}</p>
        </GlassCard>
        <GlassCard subtle className="p-4">
          <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wider font-semibold">Total Students</p>
          <p className="text-2xl font-bold text-ai-blue">{totalStudents.toLocaleString()}</p>
        </GlassCard>
        <GlassCard subtle className="p-4">
          <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wider font-semibold">Total Teachers</p>
          <p className="text-2xl font-bold text-ai-purple">{totalTeachers}</p>
        </GlassCard>
      </div>

      {/* Search Bar */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search departments by code, name, or HOD..."
            className="w-full bg-glass-light border border-glass-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ai-blue/60 transition-colors"
          />
        </div>
      </div>

      {/* Department Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="py-12 text-center text-text-muted text-xs">
          No departments found matching &quot;{searchQuery}&quot;.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dept, i) => (
            <motion.div
              key={dept.id || `dept-${dept.code}-${i}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-2xl p-5 border border-glass-border hover:border-ai-blue/30 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-10 min-w-10 px-2.5 rounded-xl bg-gradient-to-br from-ai-blue to-ai-cyan flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    <span className="text-xs font-black text-white tracking-wider whitespace-nowrap">{dept.code}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text-primary group-hover:text-ai-blue transition-colors truncate">
                      {dept.name}
                    </p>
                    <p className="text-[11px] text-text-muted font-medium mt-0.5">
                      HOD: <span className="text-text-secondary">{dept.hodName}</span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-text-muted mb-4 line-clamp-2 leading-relaxed">
                  {dept.description}
                </p>
              </div>

              <div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-xl bg-glass-light border border-glass-border/40">
                    <p className="text-sm font-bold text-ai-blue">{dept.studentCount.toLocaleString()}</p>
                    <p className="text-[9px] uppercase tracking-wider text-text-muted font-semibold mt-0.5">Students</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-glass-light border border-glass-border/40">
                    <p className="text-sm font-bold text-ai-purple">{dept.teacherCount}</p>
                    <p className="text-[9px] uppercase tracking-wider text-text-muted font-semibold mt-0.5">Teachers</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-glass-light border border-glass-border/40">
                    <p className="text-sm font-bold text-ai-cyan">{dept.classroomCount}</p>
                    <p className="text-[9px] uppercase tracking-wider text-text-muted font-semibold mt-0.5">Rooms</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-glass-border flex items-center justify-between text-[11px]">
                  <span className="text-text-muted font-medium">{dept.courseCount} Courses</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedDept(dept)}
                    className="h-7 text-xs font-medium hover:text-ai-blue"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Details Modal */}
      <AnimatePresence>
        {selectedDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
              onClick={() => setSelectedDept(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary/95 border border-glass-border rounded-2xl w-full max-w-lg p-6 relative z-10 shadow-2xl backdrop-blur-xl"
            >
              <button 
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-glass-light transition-colors" 
                onClick={() => setSelectedDept(null)} 
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 min-w-12 px-3 rounded-xl bg-gradient-to-br from-ai-blue to-ai-cyan flex items-center justify-center shrink-0 shadow-md">
                  <span className="text-sm font-black text-white tracking-wider">{selectedDept.code}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    {selectedDept.name}
                  </h3>
                  <p className="text-xs text-text-muted font-medium">
                    Head of Department: <span className="text-ai-blue font-semibold">{selectedDept.hodName}</span>
                  </p>
                </div>
              </div>

              <div className="bg-glass-light border border-glass-border rounded-xl p-3.5 mb-5 text-xs text-text-secondary leading-relaxed">
                {selectedDept.description}
              </div>

              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Department Scale & Facilities (Real-time DB)</h4>
              <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="p-2.5 rounded-xl bg-glass-light border border-glass-border/40 text-center">
                  <p className="text-base font-bold text-ai-blue">{selectedDept.studentCount.toLocaleString()}</p>
                  <p className="text-[9px] uppercase tracking-wider text-text-muted font-semibold mt-0.5">Students</p>
                </div>
                <div className="p-2.5 rounded-xl bg-glass-light border border-glass-border/40 text-center">
                  <p className="text-base font-bold text-ai-purple">{selectedDept.teacherCount}</p>
                  <p className="text-[9px] uppercase tracking-wider text-text-muted font-semibold mt-0.5">Faculty</p>
                </div>
                <div className="p-2.5 rounded-xl bg-glass-light border border-glass-border/40 text-center">
                  <p className="text-base font-bold text-ai-cyan">{selectedDept.classroomCount}</p>
                  <p className="text-[9px] uppercase tracking-wider text-text-muted font-semibold mt-0.5">Rooms</p>
                </div>
                <div className="p-2.5 rounded-xl bg-glass-light border border-glass-border/40 text-center">
                  <p className="text-base font-bold text-emerald-400">{selectedDept.courseCount}</p>
                  <p className="text-[9px] uppercase tracking-wider text-text-muted font-semibold mt-0.5">Courses</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-glass-border">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteDepartment(selectedDept)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? "Deleting..." : "Delete Department"}
                </button>
                <Button size="sm" onClick={() => setSelectedDept(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Department Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
              onClick={() => !isSubmitting && setIsAddModalOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary/95 border border-glass-border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl backdrop-blur-xl"
            >
              <button 
                disabled={isSubmitting}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-glass-light transition-colors" 
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 mb-1 text-ai-blue">
                <Building2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-text-primary uppercase tracking-wider">
                  Add Department
                </h3>
              </div>
              <p className="text-xs text-text-muted mb-4">
                Register a new academic department in the institutional registry.
              </p>

              {addError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}

              {addSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{addSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddDepartmentSubmit} className="space-y-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">
                    Department Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addName}
                    disabled={isSubmitting}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Artificial Intelligence & Machine Learning"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ai-blue/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">
                    Department Code (Abbreviation) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={addCode}
                    disabled={isSubmitting}
                    onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AIML"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary uppercase font-mono placeholder:text-text-muted focus:outline-none focus:border-ai-blue/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">
                    Head of Department (HOD) Name
                  </label>
                  <input
                    type="text"
                    value={addHodName}
                    disabled={isSubmitting}
                    onChange={(e) => setAddHodName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Gupta"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ai-blue/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={addDescription}
                    disabled={isSubmitting}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="Specialization areas, laboratory focus, and academic curriculum..."
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ai-blue/60 transition-colors resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Create Department"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
