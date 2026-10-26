"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cloud, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await useAuthStore.getState().login(email, password);
      const user = useAuthStore.getState().user;
      const userRoles = (user?.roles || []).map((r: string) => r.toUpperCase());
      const isAdminOrHod =
        userRoles.includes("SUPER_ADMIN") ||
        userRoles.includes("INSTITUTION_ADMIN") ||
        userRoles.includes("ADMIN") ||
        userRoles.includes("HOD");

      if (!isAdminOrHod) {
        await useAuthStore.getState().logout();
        setIsLoading(false);
        setError("IncorrectPortal");
        return;
      }

      setIsLoading(false);
      const redirectTarget = searchParams.get("redirect") || "/dashboard";
      router.push(redirectTarget.startsWith("/") ? redirectTarget : "/dashboard");
    } catch (err: any) {
      setIsLoading(false);
      const msg = err?.message || "";
      if (msg.includes("Invalid credentials") || msg.includes("credentials")) {
        setError("IncorrectCredentials");
      } else {
        setError(msg || "UnknownError");
      }
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
              {error === "AccessDenied"
                ? "Access Denied: Your email is not registered in the administrator database."
                : error === "IncorrectPortal"
                ? "Access Denied: This is the Admin portal. Students/Faculty should use their specific logins."
                : error === "IncorrectCredentials"
                ? "Authentication failed: Incorrect password or credentials."
                : error === "SSOError"
                ? "SSO Login failed: Your Microsoft account is not registered."
                : error === "UnknownError"
                ? "An unexpected error occurred. Please try again."
                : error}
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
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
      <React.Suspense fallback={<div className="text-white">Loading...</div>}>
        <LoginContent />
      </React.Suspense>
    </div>
  );
}
