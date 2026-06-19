"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate send
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a recovery link"
    >
      {sent ? (
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">
            Check your email for a password reset link.
          </p>
          <Link
            href="/auth/login"
            className="block text-sm text-ai-blue hover:underline font-medium"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary tracking-wide uppercase">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@institution.edu"
              required
              className={cn(
                "w-full h-11 px-4 rounded-button text-sm",
                "bg-glass-light border border-glass-border",
                "text-text-primary placeholder:text-text-muted",
                "focus:outline-none focus:border-ai-blue/50 focus:ring-1 focus:ring-ai-blue/20",
                "transition-all duration-300",
              )}
            />
          </div>
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full justify-center">
            Send Recovery Link
          </Button>
          <p className="text-center">
            <Link href="/auth/login" className="text-xs text-ai-blue hover:underline font-medium">
              Back to login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
