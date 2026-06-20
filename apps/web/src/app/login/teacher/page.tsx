"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, ArrowRight, GraduationCap, ShieldCheck, Key } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { initializeUserStore, getUsers, hashPassword, updateUserPassword } from "@/lib/userStore";
import { api, setAccessToken } from "@/lib/api/client";
import { isDemoMode } from "@/lib/demo-mode";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Compulsory Password Reset States
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleMicrosoftLogin = () => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      "/login/microsoft",
      "Microsoft SSO",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === "login-success") {
        const loggedInEmail = event.data.email;
        if (!loggedInEmail) return;
        
        try {
          const users = getUsers();
          const user = users[loggedInEmail];
          
          if (!user) {
            setError("SSOError");
            return;
          }
          
          document.cookie = "refreshToken=mock-token-123; path=/";
          localStorage.setItem("user-role", user.role);
          localStorage.setItem("currentUserEmail", loggedInEmail);
          
          if (user.role === "admin") {
            router.push("/dashboard");
          } else if (user.role === "teacher") {
            router.push("/teacher/dashboard");
          } else {
            router.push("/student/dashboard");
          }
        } catch (err) {
          setError("UnknownError");
        }
      } else if (event.data.type === "login-error") {
        setError("SSOError");
      }
    };
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  useEffect(() => {
    // Initialize the user database on load
    initializeUserStore();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic domain validation
    if (!email.endsWith(".edu.in")) {
      setIsLoading(false);
      setError("AccessDenied");
      return;
    }

    if (isDemoMode()) {
      try {
        const users = getUsers();
        const user = users[email];

        if (!user) {
          setIsLoading(false);
          setError("AccessDenied");
          return;
        }

        if (user.role !== "teacher") {
          setIsLoading(false);
          setError("IncorrectPortal");
          return;
        }

        const inputHash = await hashPassword(password);
        if (inputHash !== user.passwordHash) {
          setIsLoading(false);
          setError("IncorrectCredentials");
          return;
        }

        // Check if password change is forced
        if (user.passwordNeedsChange) {
          setIsLoading(false);
          setShowChangePassword(true);
          return;
        }

        // Successful login
        setIsLoading(false);
        document.cookie = "refreshToken=mock-token-123; path=/";
        localStorage.setItem("user-role", "teacher");
        localStorage.setItem("currentUserEmail", email);
        router.push("/teacher/dashboard");
      } catch (err) {
        setIsLoading(false);
        setError("UnknownError");
      }
    } else {
      // Live database authentication
      try {
        const res = await api.post<any>("/auth/login", { email, password });
        if (!res.success || !res.data) {
          setIsLoading(false);
          setError("IncorrectCredentials");
          return;
        }

        const { user, tokens } = res.data;

        // Map roles to lowercase
        let mappedRole = "student";
        if (user.roles?.includes("ADMIN")) mappedRole = "admin";
        else if (user.roles?.includes("TEACHER")) mappedRole = "teacher";

        if (mappedRole !== "teacher") {
          setIsLoading(false);
          setError("IncorrectPortal");
          return;
        }

        setIsLoading(false);
        setAccessToken(tokens.accessToken);
        document.cookie = `refreshToken=${tokens.refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
        localStorage.setItem("user-role", "teacher");
        localStorage.setItem("currentUserEmail", email);
        router.push("/teacher/dashboard");
      } catch (err) {
        setIsLoading(false);
        setError("UnknownError");
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (newPassword.length < 6) {
      setIsLoading(false);
      setError("PasswordTooShort");
      return;
    }

    if (newPassword === "demo123") {
      setIsLoading(false);
      setError("CannotUseDemo");
      return;
    }

    if (newPassword !== confirmPassword) {
      setIsLoading(false);
      setError("PasswordsDoNotMatch");
      return;
    }

    try {
      const newHash = await hashPassword(newPassword);
      await updateUserPassword(email, newHash, false);

      setIsLoading(false);
      // Automatically log in after password change
      document.cookie = "refreshToken=mock-token-123; path=/";
      localStorage.setItem("user-role", "teacher");
      localStorage.setItem("currentUserEmail", email);
      router.push("/teacher/dashboard");
    } catch (err) {
      setIsLoading(false);
      setError("UpdateFailed");
    }
  };

  return (
    <>
      {/* Background Subtle Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[80vw] h-[80vw] border border-white/5 rounded-full absolute" />
        <div className="w-[60vw] h-[60vw] border border-white/5 rounded-full absolute" />
        <div className="w-[40vw] h-[40vw] border border-white/5 rounded-full absolute" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      </div>

      <motion.div
        className="z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link href="/" className="flex items-center justify-center gap-3 mb-6">
          <Cloud className="w-9 h-9 text-white fill-white" />
          <div className="flex flex-col">
            <span className="text-[1.35rem] font-medium text-white leading-none tracking-tight">SMARTCAMPUS</span>
            <span className="text-[0.6rem] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">Faculty Portal</span>
          </div>
        </Link>

        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* subtle top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-blue-500 opacity-40 blur-sm" />

          <div className="flex items-center gap-2 mb-2 text-blue-400 font-semibold">
            <GraduationCap className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider">Teacher Sign In</span>
          </div>

          <AnimatePresence mode="wait">
            {!showChangePassword ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-xl sm:text-2xl font-medium text-white tracking-tight mb-1">Faculty Command Center</h1>
                <p className="text-gray-400 text-xs sm:text-sm mb-4">Enter your credentials to access your classrooms and students.</p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                    {error === "AccessDenied" && "Access Denied: Your email is not registered in the university database."}
                    {error === "IncorrectPortal" && "Access Denied: This is the Teacher portal. Students/Admins should use their specific logins."}
                    {error === "IncorrectCredentials" && "Authentication failed: Incorrect password."}
                    {error === "UnknownError" && "An unexpected error occurred. Please try again."}
                    {error === "SSOError" && "SSO Login failed: Your Microsoft account is not registered."}
                  </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Faculty Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teacher@collegename.edu.in"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                      <Link href="#" className="text-xs font-medium text-gray-500 hover:text-white transition-colors">Forgot password?</Link>
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-semibold flex items-center justify-center gap-2 transition-all mt-1 disabled:opacity-70 text-sm cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Access Dashboard <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative bg-[#111111] px-3 text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                    Or continue with
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  className="w-full bg-[#1A1A1A] hover:bg-[#262626] border border-white/10 text-white rounded-xl px-4 py-2.5 font-medium flex items-center justify-center gap-3 transition-colors text-sm cursor-pointer"
                >
                  <div className="flex gap-[2px] w-4 h-4 flex-wrap">
                    <div className="w-[7px] h-[7px] bg-[#F25022]" />
                    <div className="w-[7px] h-[7px] bg-[#7FBA00]" />
                    <div className="w-[7px] h-[7px] bg-[#00A4EF]" />
                    <div className="w-[7px] h-[7px] bg-[#FFB900]" />
                  </div>
                  Sign in with Microsoft
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="change-password-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                  <Key className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-wider">Security Policy Enforcement</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-medium text-white tracking-tight mb-1">Update Password</h1>
                <p className="text-gray-400 text-xs sm:text-sm mb-4">First-time login detected. You must change your password before continuing.</p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
                    {error === "PasswordTooShort" && "Password must be at least 6 characters long."}
                    {error === "CannotUseDemo" && "For security reasons, you cannot use the default demo password."}
                    {error === "PasswordsDoNotMatch" && "Confirm password does not match new password."}
                    {error === "UpdateFailed" && "Failed to update password. Please try again."}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white rounded-xl px-4 py-2.5 font-semibold flex items-center justify-center gap-2 transition-all mt-1 disabled:opacity-70 text-sm cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Update & Access Portal <ShieldCheck className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-gray-500 text-xs sm:text-sm mt-5 flex flex-col gap-2">
          <span>Not a teacher? <Link href="/login" className="text-blue-400 hover:underline">Student Portal</Link></span>
          <span>Are you an administrator? <Link href="/login/admin" className="text-red-400 hover:underline">Admin Portal</Link></span>
        </p>
      </motion.div>
    </>
  );
}

export default function TeacherLoginPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden px-4">
      <React.Suspense fallback={<div className="text-white">Loading...</div>}>
        <LoginContent />
      </React.Suspense>
    </div>
  );
}
