"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cloud, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { initializeUserStore, getUsers, hashPassword } from "@/lib/userStore";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize user database on load
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

    try {
      const users = getUsers();
      const user = users[email];

      if (!user) {
        setIsLoading(false);
        setError("AccessDenied");
        return;
      }

      if (user.role !== "admin") {
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

      // Successful login (Admins do not need compulsory change by default, or they have preset hashes)
      setIsLoading(false);
      document.cookie = "refreshToken=mock-token-123; path=/";
      localStorage.setItem("user-role", "admin");
      localStorage.setItem("currentUserEmail", email);
      router.push("/dashboard");
    } catch (err) {
      setIsLoading(false);
      setError("UnknownError");
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
            <span className="text-[0.6rem] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">Admin Portal</span>
          </div>
        </Link>

        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Crimson glow for administration authority */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-red-600 opacity-40 blur-sm" />

          <div className="flex items-center gap-2 mb-2 text-red-500 font-semibold">
            <Lock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Administrative Sign In</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-medium text-white tracking-tight mb-1">System Command Center</h1>
          <p className="text-gray-400 text-xs sm:text-sm mb-4">Enter credentials to manage institutional settings, teachers, and students.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
              {error === "AccessDenied" && "Access Denied: Your email is not registered in the administrator database."}
              {error === "IncorrectPortal" && "Access Denied: This is the Admin portal. Students/Faculty should use their specific logins."}
              {error === "IncorrectCredentials" && "Authentication failed: Incorrect password."}
              {error === "UnknownError" && "An unexpected error occurred. Please try again."}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@collegename.edu.in"
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
              className="w-full bg-red-650 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 font-semibold flex items-center justify-center gap-2 transition-all mt-1 disabled:opacity-70 text-sm cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.3)]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in to Dashboard <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs sm:text-sm mt-5 flex flex-col gap-2">
          <span>Not an admin? <Link href="/login" className="text-blue-400 hover:underline">Student Portal</Link></span>
          <span>Are you faculty? <Link href="/login/teacher" className="text-blue-400 hover:underline">Faculty Portal</Link></span>
        </p>
      </motion.div>
    </>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden px-4">
      <React.Suspense fallback={<div className="text-white">Loading...</div>}>
        <LoginContent />
      </React.Suspense>
    </div>
  );
}
