"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, MoreHorizontal, Download, UserPlus, ShieldAlert, X, Key, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { initializeUserStore, getUsers, saveUsers, createUser, updateUserPassword, hashPassword } from "@/lib/userStore";

// Mock Data Generator for standard students
const MOCK_DEPARTMENTS = ["CSE", "ISE", "ECE", "EEE", "AIML", "CSE(AI)", "MECH", "CIVIL"];
const generateMockStudents = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-stu-${10000 + i}`,
    studentId: `STU-${10000 + i}`,
    name: `Student ${i + 1}`,
    department: MOCK_DEPARTMENTS[Math.floor(Math.random() * MOCK_DEPARTMENTS.length)],
    semester: Math.floor(Math.random() * 8) + 1,
    attendance: Math.floor(Math.random() * 40) + 60,
    engagement: Math.floor(Math.random() * 50) + 50,
    riskLevel: Math.random() > 0.9 ? "HIGH" : Math.random() > 0.7 ? "MEDIUM" : "LOW",
    status: "ACTIVE" as const,
    isCustom: false
  }));
};

export default function StudentsPage() {
  const parentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("ALL");
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Add Form States
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addDept, setAddDept] = useState("CSE");
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Form States
  const [editTargetEmail, setEditTargetEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("CSE");
  const [editSemester, setEditSemester] = useState(1);
  const [editError, setEditError] = useState<string | null>(null);

  // Reset Password States
  const [resetTargetEmail, setResetTargetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    initializeUserStore();
  }, []);

  // Dynamic email generation
  useEffect(() => {
    if (!emailManuallyEdited && addName) {
      const sanitizedName = addName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const deptMap: Record<string, string> = {
        "CSE": "cs",
        "ISE": "is",
        "ECE": "ec",
        "EEE": "ee",
        "AIML": "ai",
        "CSE(AI)": "csai",
        "MECH": "mech",
        "CIVIL": "civil"
      };
      const deptCode = deptMap[addDept] || "cs";
      setAddEmail(`${sanitizedName}.${deptCode}2023@vemana.edu.in`);
    }
  }, [addName, addDept, emailManuallyEdited]);

  // Generate Base Mock List
  const mockStudentsBase = useMemo(() => generateMockStudents(100), []); // compaction to 100 for high performance rendering

  const allStudents = useMemo(() => {
    const users = getUsers();
    const customStudents = Object.values(users)
      .filter((u) => u.role === "student")
      .map((u, idx) => ({
        id: u.email, // Use email as unique ID to trigger password resets/edits
        studentId: u.studentId || `1VI23CS${String(100 + idx).padStart(3, "0")}`,
        name: u.fullName,
        department: u.department || "CSE",
        semester: u.semester || 1,
        attendance: 94,
        engagement: 90,
        riskLevel: "LOW" as const,
        status: "ACTIVE" as const,
        isCustom: true
      }));

    return [...customStudents, ...mockStudentsBase];
  }, [refreshKey, mockStudentsBase]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter(student => {
      const name = student.name || "";
      const sId = student.studentId || "";
      const emailId = student.id || "";
      const dept = student.department || "";
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            emailId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            dept.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRisk = filterRisk === "ALL" || student.riskLevel === filterRisk;
      return matchesSearch && matchesRisk;
    });
  }, [allStudents, searchQuery, filterRisk]);

  const rowVirtualizer = useVirtualizer({
    count: filteredStudents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // 64px row height
    overscan: 10,
  });

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addEmail.endsWith(".edu.in")) {
      setAddError("Student email must end with .edu.in");
      return;
    }

    try {
      await createUser(addEmail, addName, "student", addDept);
      setAddName("");
      setAddEmail("");
      setEmailManuallyEdited(false);
      setIsAddModalOpen(false);
      setRefreshKey(prev => prev + 1); // Trigger update
    } catch (err: any) {
      setAddError(err.message || "Failed to create student account");
    }
  };

  const handleEditStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const users = getUsers();
    if (users[editTargetEmail]) {
      users[editTargetEmail].fullName = editName;
      users[editTargetEmail].department = editDept;
      users[editTargetEmail].semester = Number(editSemester);
      saveUsers(users);
      setIsEditModalOpen(false);
      setRefreshKey(prev => prev + 1);
    } else {
      setEditError("Student not found");
    }
  };

  const handlePromoteAll = () => {
    if (confirm("Are you sure you want to promote all students to the next semester? This will update their semester numbers without altering history, emails, or embeddings.")) {
      const users = getUsers();
      let count = 0;
      Object.keys(users).forEach(email => {
        if (users[email].role === "student") {
          const currentSem = users[email].semester || 1;
          if (currentSem < 8) {
            users[email].semester = currentSem + 1;
            count++;
          }
        }
      });
      saveUsers(users);
      setRefreshKey(prev => prev + 1);
      alert(`Successfully promoted ${count} students!`);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Student ID", "Name", "Email", "Department", "Semester", "Attendance", "AI Risk Level", "Status"];
    const rows = filteredStudents.map(s => [
      s.studentId,
      s.name,
      s.id,
      s.department,
      s.semester,
      `${s.attendance}%`,
      s.riskLevel,
      s.status
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "smartcampus_students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerResetPassword = (email: string) => {
    setResetTargetEmail(email);
    setResetPassword("");
    setResetConfirm("");
    setResetError(null);
    setResetSuccess(null);
    setIsResetModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (resetPassword.length < 6) {
      setResetError("Password must be at least 6 characters long.");
      return;
    }

    if (resetPassword !== resetConfirm) {
      setResetError("Passwords do not match.");
      return;
    }

    try {
      const hashedPass = await hashPassword(resetPassword);
      await updateUserPassword(resetTargetEmail, hashedPass, false);
      setResetSuccess(`Password updated successfully for ${resetTargetEmail}!`);
      setResetPassword("");
      setResetConfirm("");
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetSuccess(null);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">Student Directory</h1>
          <p className="text-text-muted text-sm mt-1">Manage {filteredStudents.length.toLocaleString()} enrolled students</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass-light px-4 py-2 text-sm font-medium text-text-primary hover:bg-glass-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button 
            onClick={handlePromoteAll}
            className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass-light px-4 py-2 text-sm font-medium text-text-primary hover:bg-glass-medium transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Promote Semesters
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Advanced Search & Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-glass-border bg-glass-light backdrop-blur-md">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search by name, ID, or department..."
            className="w-full bg-bg-primary/20 border border-glass-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select 
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-bg-primary/20 border border-glass-border rounded-lg px-3 py-2 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="ALL" className="bg-bg-secondary text-text-primary">All Risk Levels</option>
            <option value="HIGH" className="bg-bg-secondary text-text-primary">High Risk</option>
            <option value="MEDIUM" className="bg-bg-secondary text-text-primary">Medium Risk</option>
            <option value="LOW" className="bg-bg-secondary text-text-primary">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Virtualized Data Table */}
      <div className="flex-1 rounded-xl border border-glass-border bg-glass-medium backdrop-blur-md overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-glass-border bg-glass-light text-xs font-semibold text-text-muted uppercase tracking-wider">
          <div className="col-span-3">Student</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-1">Sem</div>
          <div className="col-span-2">Attendance</div>
          <div className="col-span-2">AI Risk Level</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Virtualized Body */}
        <div 
          ref={parentRef} 
          className="flex-1 overflow-auto custom-scrollbar"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const student = filteredStudents[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  className="absolute top-0 left-0 w-full grid grid-cols-12 gap-4 p-4 border-b border-glass-border/30 hover:bg-glass-light/30 transition-colors items-center cursor-pointer"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => {
                    if (!student.isCustom) {
                      router.push(`/dashboard/students/${student.studentId}`);
                    }
                  }}
                >
                  {/* Student Info */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-glass-border flex items-center justify-center text-xs font-bold text-text-primary">
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{student.name}</div>
                      <div className="text-xs text-text-muted truncate">{student.studentId}</div>
                    </div>
                  </div>

                  {/* Department */}
                  <div className="col-span-2 text-sm text-text-secondary truncate">
                    {student.department}
                  </div>

                  {/* Semester */}
                  <div className="col-span-1 text-sm text-text-secondary font-mono">
                    {student.semester}
                  </div>

                  {/* Attendance */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-full max-w-[100px] h-2 bg-glass-border rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", student.attendance > 85 ? "bg-success" : student.attendance > 75 ? "bg-warning" : "bg-error")}
                        style={{ width: `${student.attendance}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted font-mono">{student.attendance}%</span>
                  </div>

                  {/* Risk Level */}
                  <div className="col-span-2 flex items-center gap-2">
                    {student.riskLevel === 'HIGH' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20">
                        <ShieldAlert className="w-3 h-3" /> High Risk
                      </span>
                    ) : student.riskLevel === 'MEDIUM' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                        Medium Risk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                        Low Risk
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-1 text-center font-mono">
                    <span className={cn("text-xs font-medium", student.status === 'ACTIVE' ? "text-success" : "text-text-muted")}>
                      {student.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {student.isCustom ? (
                      <>
                        <button 
                          onClick={() => {
                            const users = getUsers();
                            const u = users[student.id];
                            if (u) {
                              setEditTargetEmail(student.id);
                              setEditName(u.fullName);
                              setEditDept(u.department || "CSE");
                              setEditSemester(u.semester || 1);
                              setIsEditModalOpen(true);
                            }
                          }}
                          className="p-1 rounded hover:bg-glass-light transition-colors text-text-muted hover:text-blue-500"
                          title="Edit Student Profile"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => triggerResetPassword(student.id)}
                          className="p-1 rounded hover:bg-glass-light transition-colors text-text-muted hover:text-amber-400"
                          title="Direct password reset"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete student ${student.name}?`)) {
                              const users = getUsers();
                              delete users[student.id];
                              saveUsers(users);
                              setRefreshKey(prev => prev + 1);
                            }
                          }}
                          className="p-1 rounded hover:bg-glass-light transition-colors text-text-muted hover:text-red-500"
                          title="Delete Student"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-glass-light transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary/95 border border-glass-border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl backdrop-blur-xl"
            >
              <button 
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-glass-light transition-colors" 
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wider mb-1">Enroll New Student</h3>
              <p className="text-xs text-text-muted mb-4">Create a student account. The default temporary password is <code className="text-amber-400 font-mono">demo123</code>.</p>

              {addError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddStudentSubmit} className="space-y-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Student Full Name</label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Manjunatha Prasad"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-glass-border/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Student Email (.edu.in)</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => {
                      setAddEmail(e.target.value);
                      setEmailManuallyEdited(true);
                    }}
                    placeholder="e.g. manjunatha.cs2023@vemana.edu.in"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-glass-border/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Department</label>
                  <select
                    value={addDept}
                    onChange={(e) => setAddDept(e.target.value)}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                  >
                    {MOCK_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button className="px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary text-xs cursor-pointer" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 cursor-pointer">Create Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary/95 border border-glass-border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl backdrop-blur-xl"
            >
              <button 
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-glass-light transition-colors" 
                onClick={() => setIsEditModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wider mb-1">Edit Student Profile</h3>
              <p className="text-xs text-text-muted mb-4">Update details for <strong className="text-text-primary">{editTargetEmail}</strong>.</p>

              {editError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                  {editError}
                </div>
              )}

              <form onSubmit={handleEditStudentSubmit} className="space-y-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Student Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Department</label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                  >
                    {MOCK_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Semester</label>
                  <select
                    value={editSemester}
                    onChange={(e) => setEditSemester(Number(e.target.value))}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button className="px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary text-xs cursor-pointer" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 cursor-pointer">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsResetModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary/95 border border-glass-border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl backdrop-blur-xl"
            >
              <button 
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-glass-light transition-colors" 
                onClick={() => setIsResetModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 text-amber-500 font-semibold mb-2">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-mono">Administrative Control</span>
              </div>
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wider mb-1">Direct Reset Password</h3>
              <p className="text-xs text-text-muted mb-4">Directly change password for student <strong className="text-text-primary">{resetTargetEmail}</strong>.</p>

              {resetError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  {resetSuccess}
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">New Password</label>
                  <input
                    type="password"
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-glass-border/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-glass-border/60 transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button className="px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary text-xs cursor-pointer" type="button" onClick={() => setIsResetModalOpen(false)}>Cancel</button>
                  <button type="submit" className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 cursor-pointer">Update Password</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
