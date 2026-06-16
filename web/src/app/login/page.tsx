"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cloud, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'login-success') {
        router.push('/dashboard');
      } else if (event.data?.type === 'login-error') {
        setError(event.data.error);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  const handleMicrosoftSSO = () => {
    // Open a new tab/popup for the login flow
    // Using the custom mock Microsoft page to prevent NextAuth redirect loop
    window.open(
      '/login/microsoft',
      'MicrosoftLoginPopup',
      'width=600,height=700,left=200,top=200'
    );
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Verify email domain matches .edu.in (database validation)
    if (!email.endsWith(".edu.in")) {
      setIsLoading(false);
      setError("AccessDenied");
      return;
    }

    // Simulate API call, then redirect to dashboard
    setTimeout(() => {
      setIsLoading(false);
      // Set the mock refreshToken cookie so the middleware authorizes access to /dashboard
      document.cookie = "refreshToken=mock-token-123; path=/";
      router.push("/dashboard");
    }, 1000);
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
            <span className="text-[0.6rem] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">Intelligent Education</span>
          </div>
        </Link>

        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* subtle top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-white opacity-20 blur-sm" />
          
          <h1 className="text-xl sm:text-2xl font-medium text-white tracking-tight mb-1">Welcome back</h1>
          <p className="text-gray-400 text-xs sm:text-sm mb-4">Enter your credentials to access the command center.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4">
              {error === 'AccessDenied' ? 'Access Denied: Your email is not registered in the university database.' : 'Authentication failed. Please try again.'}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Work Email</label>
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
              className="w-full bg-white hover:bg-gray-200 text-black rounded-xl px-4 py-2.5 font-semibold flex items-center justify-center gap-2 transition-colors mt-1 disabled:opacity-70 text-sm cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/10 flex flex-col gap-4">
             <button 
                type="button"
                onClick={handleMicrosoftSSO}
                className="w-full bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/5 text-white rounded-xl px-4 py-2.5 font-medium flex items-center justify-center gap-3 transition-colors text-xs uppercase tracking-wider cursor-pointer"
             >
                <svg className="w-4 h-4" viewBox="0 0 21 21" fill="currentColor">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Continue with Microsoft
             </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs sm:text-sm mt-5">
          Don't have an account? <Link href="#" className="text-white hover:underline">Contact your IT admin</Link>
        </p>
      </motion.div>

    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden px-4">
      <React.Suspense fallback={<div className="text-white">Loading...</div>}>
        <LoginContent />
      </React.Suspense>
    </div>
  );
}
