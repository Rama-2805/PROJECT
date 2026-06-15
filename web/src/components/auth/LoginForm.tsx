"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/_shared/schemas/index";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "./PasswordInput";

interface LoginFormProps {
  onSubmit: (data: LoginInput) => Promise<void>;
  error?: string;
}

export function LoginForm({ onSubmit, error }: LoginFormProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const handleFormSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-error/10 border border-error/20 px-4 py-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary tracking-wide uppercase">
          Email
        </label>
        <input
          type="email"
          {...register("email")}
          placeholder="you@institution.edu"
          className={cn(
            "w-full h-11 px-4 rounded-button text-sm",
            "bg-glass-light border border-glass-border",
            "text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:border-ai-blue/50 focus:ring-1 focus:ring-ai-blue/20",
            "transition-all duration-300",
            errors.email && "border-error/50",
          )}
        />
        {errors.email && (
          <p className="text-xs text-error">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary tracking-wide uppercase">
            Password
          </label>
          <a
            href="/auth/forgot-password"
            className="text-xs text-ai-blue hover:text-ai-blue/80 transition-colors"
          >
            Forgot?
          </a>
        </div>
        <PasswordInput
          {...register("password")}
          placeholder="Enter your password"
          error={errors.password?.message}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="remember"
          className="w-3.5 h-3.5 rounded border-glass-border bg-glass-light text-ai-blue focus:ring-ai-blue/20"
        />
        <label htmlFor="remember" className="text-xs text-text-muted">
          Remember me
        </label>
      </div>

      <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full justify-center">
        Sign In
      </Button>
    </form>
  );
}
