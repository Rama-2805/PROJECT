"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { initializeUserStore, getUsers, createUser, updateUserPassword, hashPassword, type AppUser } from "@/lib/userStore";
import { api } from "@/lib/api/client";
import { X, ShieldAlert, ShieldCheck, Mail, Phone, Calendar, Search } from "lucide-react";

const DEPARTMENTS = ["CSE", "ISE", "ECE", "EEE", "AIML", "CSE(AI)", "MECH", "CIVIL"];

interface HODUser {
  fullName: string;
  email: string;
  department: string;
  createdAt: string;
  phone: string;
}

export default function HODPage() {
  const [hods, setHods] = useState<HODUser[]>([]);
  const [availableDepts, setAvailableDepts] = useState<string[]>(DEPARTMENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  // Add HOD Form States
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addDept, setAddDept] = useState("CSE");
  const [addError, setAddError] = useState<string | null>(null);

  // Reset Password Form States
  const [resetTargetEmail, setResetTargetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    initializeUserStore();
    const users = getUsers();

    // Fetch teachers from backend to include any HOD accounts created via API
    let backendHods: HODUser[] = [];
    try {
      const [res, dRes] = await Promise.all([
        api.get<any[]>("/teachers"),
        api.get<any[]>("/departments"),
      ]);
      if (dRes.success && Array.isArray(dRes.data) && dRes.data.length > 0) {
        const codes = Array.from(new Set([...DEPARTMENTS, ...dRes.data.map((d: any) => d.code.toUpperCase())]));
        setAvailableDepts(codes);
      }
      if (res.success && Array.isArray(res.data)) {
        backendHods = res.data
          .filter((t: any) =>
            t.specialization?.toLowerCase().includes("administration") ||
            t.specialization?.toLowerCase().includes("hod") ||
            t.user?.userRoles?.some((ur: any) => ur.role?.name === "HOD")
          )
          .map((t: any) => ({
            fullName: t.fullName,
            email: t.email,
            department: t.department?.code || t.department?.name || "CSE",
            createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Active",
            phone: t.phone || "+91-9876543210",
          }));
      }
    } catch {
      // ignore
    }
    
    // Filter HODs from user store
    const localHodList: HODUser[] = Object.values(users)
      .filter((u) => u.role === "hod")
      .map((u) => ({
        fullName: u.fullName,
        email: u.email,
        department: u.department || "CSE",
        createdAt: u.createdAt,
        phone: "+91-9876543210"
      }));

    // Deduplicate by normalized email
    const emailMap = new Map<string, HODUser>();
    for (const h of [...backendHods, ...localHodList]) {
      const key = h.email.trim().toLowerCase();
      if (!emailMap.has(key)) {
        emailMap.set(key, h);
      }
    }

    setHods(Array.from(emailMap.values()));
    setLoading(false);
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

  const handleAddHODSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const normalizedEmail = addEmail.trim().toLowerCase();
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu\.in$/;
    if (!emailPattern.test(normalizedEmail)) {
      setAddError("HOD email must be an institutional address ending in .edu.in");
      return;
    }

    try {
      const res = await api.post("/teachers", {
        fullName: addName.trim(),
        email: normalizedEmail,
        departmentId: addDept,
        isHod: true,
        role: "HOD",
        password: "hod123",
      });
      if (!res.success && res.error) {
        throw new Error(res.error);
      }
      await createUser(normalizedEmail, addName.trim(), "hod", addDept);
      setAddName("");
      setAddEmail("");
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setAddError(err.message || "Failed to create HOD account");
    }
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
      const targetEmail = resetTargetEmail.trim().toLowerCase();
      const hashedPass = await hashPassword(resetPassword);
      await updateUserPassword(targetEmail, hashedPass, false);
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

  const filteredHods = hods.filter((h) => {
    const matchesSearch = h.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          h.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept ? h.department === selectedDept : true;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">HOD Management</h2>
          <p className="text-xs text-text-muted">Manage department HODs, assign departments, and configure credentials</p>
        </div>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="self-start sm:self-auto min-h-[40px]">
          <ShieldCheck className="w-4 h-4 mr-2" />
          Add HOD Account
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-glass-light border border-glass-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-glass-border/60 transition-colors"
          />
        </div>
        
        <div className="flex flex-wrap gap-1.5 self-start sm:self-center">
          <button
            onClick={() => setSelectedDept("")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer border border-glass-border",
              !selectedDept 
                ? "bg-text-primary text-bg-primary font-bold shadow-md" 
                : "bg-glass-light text-text-secondary hover:text-text-primary hover:bg-glass-medium"
            )}
          >
            All Departments
          </button>
          {availableDepts.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer border border-glass-border",
                selectedDept === dept 
                  ? "bg-text-primary text-bg-primary font-bold shadow-md" 
                  : "bg-glass-light text-text-secondary hover:text-text-primary hover:bg-glass-medium"
              )}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of HODs */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredHods.length === 0 ? (
        <GlassCard className="py-12 text-center text-text-muted text-xs">
          No Head of Departments found matching your search.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHods.map((hod, i) => (
            <motion.div
              key={`hod-${hod.email}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <GlassCard className="p-5 flex flex-col justify-between h-full hover:border-glass-border/40 transition-all border border-glass-border relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2.5 bg-blue-500/10 text-blue-400 font-bold font-mono text-[9px] rounded-bl-xl border-l border-b border-glass-border uppercase tracking-widest">
                  {hod.department}
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-text-primary text-sm group-hover:text-blue-400 transition-colors pr-10 truncate">{hod.fullName}</h4>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Head of Department</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span className="truncate">{hod.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span>{hod.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span>Joined {new Date(hod.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-glass-border">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => triggerResetPassword(hod.email)}
                    className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 text-[10px]"
                  >
                    Reset Password
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add HOD Modal */}
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
              
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wider mb-1">Add HOD Account</h3>
              <p className="text-[11px] text-text-muted mb-4">
                Initialize a Head of Department credential. Temporary password is <code className="text-amber-400 font-mono">hod123</code>.
              </p>

              {addError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddHODSubmit} className="space-y-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">HOD Name</label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Dr. Manjunatha Prasad"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-glass-border/60 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Institutional Email (.edu.in)</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="e.g. manjunatha@vemana.edu.in"
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
                    {availableDepts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Create HOD Account</Button>
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
    </div>
  );
}
