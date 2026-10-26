"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { TeacherCard } from "@/components/teachers/TeacherCard";
import { getTeachers, type Teacher } from "@/lib/mock/teachers";
import { getDepartments, type Department } from "@/lib/mock/departments";
import { cn } from "@/lib/utils/cn";
import { initializeUserStore, getUsers, saveUsers, createUser, updateUserPassword, hashPassword } from "@/lib/userStore";
import { api } from "@/lib/api/client";
import { X, ShieldAlert } from "lucide-react";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  // Add Teacher Form States
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addDept, setAddDept] = useState("CSE");
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Teacher Form States
  const [editTargetEmail, setEditTargetEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("CSE");
  const [editError, setEditError] = useState<string | null>(null);

  // Reset Password Form States
  const [resetTargetEmail, setResetTargetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [backendTeachers, teachersData, backendDepts, mockDepts] = await Promise.all([
        api.get<any>("/teachers").catch(() => null),
        getTeachers(),
        api.get<any[]>("/departments").catch(() => null),
        getDepartments(),
      ]);

      const deptsData = (backendDepts?.success && Array.isArray(backendDepts.data) && backendDepts.data.length > 0)
        ? backendDepts.data.map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            hodName: d.hodName || "Not Assigned",
            description: d.description || "",
            studentCount: d._count?.students || 0,
            teacherCount: d._count?.teachers || 0,
            classroomCount: d._count?.classrooms || 0,
            courseCount: d._count?.courses || 0,
            isActive: d.isActive !== false,
          }))
        : mockDepts;

      // Initialize and merge custom teachers
      initializeUserStore();
      const users = getUsers();
      const customTeachers: Teacher[] = Object.values(users)
        .filter((u) => u.role === "teacher")
        .map((u, idx) => {
          const wasDetectedToday = (idx % 2 === 0);
          const startedSessionToday = (idx % 3 === 0);
          const isActive = wasDetectedToday || startedSessionToday;

          return {
            id: `teacher-custom-${idx}`,
            employeeId: `EMP-${1200 + idx}`,
            fullName: u.fullName,
            email: u.email,
            phone: "+91-9988776655",
            departmentId: u.department === "CSE" ? "dept-com" : u.department || "dept-com",
            departmentName: u.department || "CSE",
            specialization: "Artificial Intelligence & Software Systems",
            subjectsCount: 2,
            classSessionsCount: 6,
            isActive: isActive,
            isCustom: true
          } as any;
        });

      let loadedTeachers: Teacher[] = [];
      if (backendTeachers && backendTeachers.success && Array.isArray(backendTeachers.data) && backendTeachers.data.length > 0) {
        loadedTeachers = backendTeachers.data.map((t: any) => ({
          id: t.id,
          employeeId: t.employeeId || `EMP-${t.id.slice(-4)}`,
          fullName: t.user?.fullName || t.fullName || "Faculty Member",
          email: t.user?.email || t.email || "",
          phone: t.phone || "+91-9876543210",
          departmentId: t.departmentId || "dept-com",
          departmentName: t.department?.name || "Computer Science",
          specialization: t.specialization || "Engineering",
          subjectsCount: t.subjects?.length || 2,
          classSessionsCount: t.classesCount || 4,
          isActive: t.isActive !== false,
        }));
      }

      // Deduplicate all teachers strictly by email (Backend > Custom > Mock)
      const seenEmails = new Set<string>();
      const deduplicatedTeachers: Teacher[] = [];

      for (const t of loadedTeachers) {
        const emailLower = (t.email || "").toLowerCase().trim();
        if (emailLower && !seenEmails.has(emailLower)) {
          seenEmails.add(emailLower);
          deduplicatedTeachers.push(t);
        }
      }

      for (const t of customTeachers) {
        const emailLower = (t.email || "").toLowerCase().trim();
        if (emailLower && !seenEmails.has(emailLower)) {
          seenEmails.add(emailLower);
          deduplicatedTeachers.push(t);
        }
      }

      for (const t of teachersData) {
        const emailLower = (t.email || "").toLowerCase().trim();
        if (emailLower && !seenEmails.has(emailLower)) {
          seenEmails.add(emailLower);
          deduplicatedTeachers.push(t);
        }
      }

      setTeachers(deduplicatedTeachers);
      setDepartments(deptsData);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) loadData();
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = selectedDept
    ? teachers.filter((t) => t.departmentId === selectedDept || t.departmentName === selectedDept)
    : teachers;

  const activeTeachers = filtered.filter((t) => t.isActive).length;
  const totalSessions = filtered.reduce((sum, t) => sum + t.classSessionsCount, 0);

  // Handle Add Teacher Submission
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const normalizedEmail = addEmail.trim().toLowerCase();
    if (!normalizedEmail.endsWith(".edu.in")) {
      setAddError("Teacher email must end with .edu.in");
      return;
    }

    try {
      const res = await api.post("/teachers", {
        fullName: addName.trim(),
        email: normalizedEmail,
        departmentId: addDept,
        password: "demo123",
      });
      if (!res.success && res.error) {
        throw new Error(res.error);
      }
      await createUser(normalizedEmail, addName.trim(), "teacher", addDept);
      setAddName("");
      setAddEmail("");
      setIsAddModalOpen(false);
      loadData(); // Reload teacher list
    } catch (err: any) {
      setAddError(err.message || "Failed to create teacher account");
    }
  };

  // Handle Edit Teacher Submission
  const handleEditTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const users = getUsers();
    if (users[editTargetEmail]) {
      users[editTargetEmail].fullName = editName;
      users[editTargetEmail].department = editDept;
      saveUsers(users);
      setIsEditModalOpen(false);
      loadData();
    } else {
      setEditError("Faculty member not found");
    }
  };

  // Handle Delete Teacher
  const handleDeleteTeacher = (email: string) => {
    if (confirm(`Are you sure you want to delete teacher ${email}?`)) {
      const users = getUsers();
      delete users[email];
      saveUsers(users);
      loadData();
    }
  };

  // Trigger Edit Modal
  const triggerEditTeacher = (email: string) => {
    const users = getUsers();
    const u = users[email];
    if (u) {
      setEditTargetEmail(email);
      setEditName(u.fullName);
      setEditDept(u.department || "CSE");
      setEditError(null);
      setIsEditModalOpen(true);
    }
  };

  // Trigger Reset Password Modal
  const triggerResetPassword = (email: string) => {
    setResetTargetEmail(email);
    setResetPassword("");
    setResetConfirm("");
    setResetError(null);
    setResetSuccess(null);
    setIsResetModalOpen(true);
  };

  // Handle Reset Password Submission
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
      const targetEmail = resetTargetEmail.trim().toLowerCase();
      const hashedPass = await hashPassword(resetPassword);
      await updateUserPassword(targetEmail, hashedPass, false); // Direct override clears force reset
      const res = await api.post("/teachers/reset-password", {
        email: targetEmail,
        password: resetPassword,
      });
      if (!res.success && res.error) {
        console.warn("Backend reset password warning:", res.error);
      }
      setResetSuccess(`Password for ${resetTargetEmail} updated successfully!`);
      setResetPassword("");
      setResetConfirm("");
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetSuccess(null);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to update password");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Teacher Management</h2>
          <p className="text-xs text-text-muted">Manage faculty members, credentials, and settings</p>
        </div>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Teacher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Total Faculty</p>
          <p className="text-xl font-bold text-text-primary">{filtered.length}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Active Teachers</p>
          <p className="text-xl font-bold text-success">{activeTeachers}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Weekly Sessions</p>
          <p className="text-xl font-bold text-ai-purple">{totalSessions}</p>
        </GlassCard>
      </div>

      {/* Department Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedDept("")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
            !selectedDept ? "bg-ai-blue text-black font-semibold" : "glass text-text-dim hover:text-text-primary",
          )}
        >
          All Departments
        </button>
        {departments.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDept(d.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              selectedDept === d.id ? "bg-ai-blue text-black font-semibold" : "glass text-text-dim hover:text-text-primary",
            )}
          >
            {d.code}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((teacher, i) => (
            <motion.div
              key={teacher.id ? `teacher-${teacher.id}` : `teacher-${teacher.email || i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <TeacherCard 
                teacher={teacher} 
                onResetPassword={triggerResetPassword}
                onEdit={triggerEditTeacher}
                onDelete={handleDeleteTeacher}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Teacher Modal */}
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
              
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wider mb-1">Add New Faculty</h3>
              <p className="text-xs text-text-muted mb-4">Create a new teacher account. The default temporary password will be <code className="text-amber-400 font-mono">demo123</code>.</p>

              {addError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddTeacherSubmit} className="space-y-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kumar"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-glass-border/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Work Email (.edu.in)</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="e.g. r.kumar@collegename.edu.in"
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
                    {(departments.length > 0 ? departments.map(d => d.code) : ["CSE", "ISE", "ECE", "EEE", "AIML", "MECH", "CIVIL"]).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Create Account</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Teacher Modal */}
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
              
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wider mb-1">Edit Faculty Profile</h3>
              <p className="text-xs text-text-muted mb-4">Update details for <strong className="text-text-primary">{editTargetEmail}</strong>.</p>

              {editError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                  {editError}
                </div>
              )}

              <form onSubmit={handleEditTeacherSubmit} className="space-y-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Full Name</label>
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
                    {["CSE", "ISE", "ECE", "EEE", "AIML", "CSE(AI)", "MECH", "CIVIL"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Save Changes</Button>
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
              <p className="text-xs text-text-muted mb-4">Directly change password for <strong className="text-text-primary">{resetTargetEmail}</strong>.</p>

              {resetError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl mb-4">
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
                  <Button size="sm" variant="ghost" type="button" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Update Password</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
