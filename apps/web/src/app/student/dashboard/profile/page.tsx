"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { User, Mail, Shield, BookOpen, Clock, Calendar, Key, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { getUsers, hashPassword, updateUserPassword } from "@/lib/userStore";

export default function StudentProfilePage() {
  const [student, setStudent] = useState({
    fullName: "",
    email: "",
    department: "Computer Science & Engineering",
    joiningDate: "August 18, 2023",
    semester: "Semester 4",
    id: "—",
    phone: "—",
    campusCardStatus: "Active"
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiRequest<any>("/auth/profile");
        if (res && res.success && res.data) {
          const u = res.data;
          const stu = u.student || {};
          const name = stu.fullName || u.fullName || "Student";
          const usn = stu.studentId || u.studentId || "—";
          const dept = stu.department?.name || u.department || "Computer Science & Engineering";
          const sem = stu.semester ? `Semester ${stu.semester}` : "Semester 4";
          const phone = stu.phone || u.phoneNumber || "—";

          setStudent({
            fullName: name,
            email: u.email,
            department: dept,
            joiningDate: "August 18, 2023",
            semester: sem,
            id: usn,
            phone: phone,
            campusCardStatus: "Active"
          });
          localStorage.setItem("currentUserName", name);
          localStorage.setItem("currentUserEmail", u.email);
          localStorage.setItem("currentUserUSN", usn);
          return;
        }
      } catch (err) {}

      if (typeof window !== "undefined") {
        const email = localStorage.getItem("currentUserEmail") || "";
        const name = localStorage.getItem("currentUserName");
        const usn = localStorage.getItem("currentUserUSN");
        const users = getUsers();
        if (email && users[email]) {
          setStudent({
            fullName: users[email].fullName,
            email: users[email].email,
            department: users[email].department || "Computer Science & Engineering",
            joiningDate: "August 18, 2023",
            semester: users[email].semester ? `Semester ${users[email].semester}` : "Semester 4",
            id: users[email].studentId || "—",
            phone: "—",
            campusCardStatus: "Active"
          });
        } else if (email) {
          setStudent({
            fullName: name || "Student",
            email: email,
            department: "Computer Science & Engineering",
            joiningDate: "August 18, 2023",
            semester: "Semester 4",
            id: usn || "—",
            phone: "—",
            campusCardStatus: "Active"
          });
        }
      }
    }
    loadProfile();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    if (newPassword.length < 6) {
      setIsLoading(false);
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword === "demo123") {
      setIsLoading(false);
      setError("Cannot use the default demo password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setIsLoading(false);
      setError("Confirm password does not match new password.");
      return;
    }

    try {
      const newHash = await hashPassword(newPassword);
      await updateUserPassword(student.email, newHash, false);
      setIsLoading(false);
      setMessage("Password updated successfully! Your credentials have been secured.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setIsLoading(false);
      setError("Failed to update password. Please try again.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Student Profile</h2>
        <p className="text-xs text-text-muted">Manage your personal records, contact information, and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Card: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <GlassCard className="text-center p-6 flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 p-[2px] mb-4">
              <div className="h-full w-full rounded-full bg-bg-secondary flex items-center justify-center border border-glass-border">
                <User className="h-10 w-10 text-text-primary" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-text-primary">{student.fullName}</h3>
            <p className="text-xs text-text-muted mb-2">Student Enrolled</p>
            <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              {student.id}
            </span>

            <div className="w-full border-t border-glass-border mt-6 pt-6 space-y-3.5 text-left text-xs text-text-secondary">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-text-muted" />
                <span className="truncate">{student.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-text-muted" />
                <span>{student.department}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-text-muted" />
                <span>Enrolled: {student.joiningDate}</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Columns: Personal Details & Password Change */}
        <div className="md:col-span-2 space-y-6">
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-glass-border pb-3">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-text-primary">Academic Details</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-text-muted mb-0.5">Enrolled Semester</p>
                <p className="font-semibold text-text-primary">{student.semester}</p>
              </div>
              <div>
                <p className="text-text-muted mb-0.5">Department Name</p>
                <p className="font-semibold text-text-primary">{student.department}</p>
              </div>
              <div>
                <p className="text-text-muted mb-0.5">Contact Number</p>
                <p className="font-semibold text-text-primary">{student.phone}</p>
              </div>
              <div>
                <p className="text-text-muted mb-0.5">Biometric Campus Card</p>
                <p className="font-semibold text-emerald-400">{student.campusCardStatus}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-glass-border pb-3">
              <Key className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-semibold text-text-primary">Update Security Password</h3>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                {message}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Change Account Password"}
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
