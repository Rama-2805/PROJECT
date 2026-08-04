"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Download, UserPlus, X,
  Loader2, RefreshCw, Mail, Phone, User,
  GraduationCap, ChevronLeft, ChevronRight,
  Users, CheckCircle2, AlertCircle, BadgeCheck, Key, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiRequest } from "@/lib/api/client";

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
  attendancePercentage: number;
  department: Department;
  course: Course;
}

interface ApiResponse {
  data: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const GENDER_COLORS: Record<string, string> = {
  Male:   "text-blue-400 bg-blue-500/10 border-blue-500/30",
  Female: "text-pink-400 bg-pink-500/10 border-pink-500/30",
};

const PAGE_SIZE = 1000;

/* ═══════════════════════════════════════════════════════════════════
   AVATAR
═══════════════════════════════════════════════════════════════════ */
function Avatar({ name, gender }: { name: string; gender?: string | null }) {
  const letter = name?.charAt(0)?.toUpperCase() || "?";
  const isFemale = gender?.toLowerCase().includes("f");
  return (
    <div className={cn(
      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border shrink-0",
      isFemale
        ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-pink-500/30 text-pink-300"
        : "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300"
    )}>
      {letter}
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
      <div className="col-span-2"><div className="h-3 bg-glass-light rounded w-5/6" /></div>
      <div className="col-span-2"><div className="h-3 bg-glass-light rounded w-2/3" /></div>
      <div className="col-span-2"><div className="h-3 bg-glass-light rounded w-3/4" /></div>
      <div className="col-span-2"><div className="h-3 bg-glass-light rounded w-1/2" /></div>
      <div className="col-span-1"><div className="h-5 bg-glass-light rounded-full w-12" /></div>
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

  const [departments, setDepartments] = useState<Department[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Fetch students (Always sorted by USN / studentId ascending) ──
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
      
      // Check if response is valid (no error status)
      if (res && !res.error && !(res as any).statusCode) {
        // Extract student array (handles both raw NestJS response and wrapper)
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

  // Debounce search and filter triggers
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchStudents(1, searchQuery, deptFilter, semFilter);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, deptFilter, semFilter, fetchStudents]);

  useEffect(() => {
    fetchStudents(page, searchQuery, deptFilter, semFilter);
  }, [page]); // eslint-disable-line

  // Filter by gender and apply strict USN sorting
  const displayStudents = useMemo(() => {
    let list = students;
    if (genderFilter !== "ALL") {
      list = list.filter(s =>
        s.gender?.toLowerCase().startsWith(genderFilter[0].toLowerCase())
      );
    }
    return [...list].sort((a, b) => {
      const usnA = a.studentId || a.rollNumber || "";
      const usnB = b.studentId || b.rollNumber || "";
      return usnA.localeCompare(usnB, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [students, genderFilter]);

  const [resetModalStudent, setResetModalStudent] = useState<Student | null>(null);
  const [resetting, setResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Stats
  const maleCount   = students.filter(s => s.gender?.toLowerCase().startsWith("m")).length;
  const femaleCount = students.filter(s => s.gender?.toLowerCase().startsWith("f")).length;
  const enrolledCount = students.filter(s => s.faceEnrolled).length;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["USN", "Name", "Gender", "College Email", "Mobile", "Department", "Semester", "Status"];
    const rows = displayStudents.map(s => [
      s.studentId || s.rollNumber || "",
      s.fullName,
      s.gender || "",
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
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">Student Directory</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {loading ? "Loading..." : `${total.toLocaleString()} students across all departments`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStudents(page, searchQuery, deptFilter, semFilter)}
            className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass-light px-3 py-2 text-sm text-text-primary hover:bg-glass-medium transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass-light px-4 py-2 text-sm font-medium text-text-primary hover:bg-glass-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats Strip ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Students",   value: total,         icon: Users,        color: "text-blue-400" },
          { label: "Male",             value: maleCount,     icon: User,         color: "text-blue-400" },
          { label: "Female",           value: femaleCount,   icon: User,         color: "text-pink-400" },
          { label: "Face Enrolled",    value: enrolledCount, icon: BadgeCheck,   color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-glass-border bg-glass-light backdrop-blur-md">
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

          {/* Semester Filter */}
          <select
            value={semFilter}
            onChange={e => { setSemFilter(e.target.value); setPage(1); }}
            className="bg-bg-primary/20 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
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
            className="bg-bg-primary/20 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
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
            className="bg-bg-primary/20 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
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
          <div className="col-span-3">College Email</div>
          <div className="col-span-2">Mobile</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-1 text-center">Reset Pw</div>
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
                className="text-xs text-blue-400 hover:underline"
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
                <button onClick={() => setSearchQuery("")} className="text-xs text-blue-400 hover:underline">
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
                {/* Name + USN */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <Avatar name={student.fullName} gender={gender} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate leading-tight">
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

                {/* College Email */}
                <div className="col-span-3 flex items-center gap-1.5 min-w-0">
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

                {/* Department */}
                <div className="col-span-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20">
                    {student.department?.code || "—"}
                  </span>
                  <p className="text-[10px] text-text-muted mt-0.5 truncate">
                    Sem {student.semester}
                  </p>
                </div>

                {/* Reset Password Action */}
                <div className="col-span-1 text-center">
                  <button
                    onClick={() => setResetModalStudent(student)}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                    title={`Reset Password for ${student.fullName} (${usn}) to demo123`}
                  >
                    <Key className="w-3.5 h-3.5" />
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
          <div className="text-[11px] text-text-muted">
            All records displayed on single page
          </div>
        </div>
      </div>

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
    </div>
  );
}
