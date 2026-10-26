"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/_shared/schemas/index";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "./PasswordInput";

interface RegisterFormProps {
  onSubmit: (data: RegisterInput) => Promise<void>;
  error?: string;
}

export function RegisterForm({ onSubmit, error }: RegisterFormProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const password = useWatch({ control, name: "password", defaultValue: "" });

  const handleFormSubmit = async (data: RegisterInput) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-error/10 border border-error/20 px-4 py-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary tracking-wide uppercase">
          Full Name
        </label>
        <input
          {...register("fullName")}
          placeholder="Dr. Jane Smith"
          className={cn(
            "w-full h-11 px-4 rounded-button text-sm",
            "bg-glass-light border border-glass-border text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:border-ai-blue/50 focus:ring-1 focus:ring-ai-blue/20",
            errors.fullName && "border-error/50",
          )}
        />
        {errors.fullName && <p className="text-xs text-error">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary tracking-wide uppercase">
          Institution Name
        </label>
        <input
          {...register("institutionName")}
          placeholder="Stanford University"
          className={cn(
            "w-full h-11 px-4 rounded-button text-sm",
            "bg-glass-light border border-glass-border text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:border-ai-blue/50 focus:ring-1 focus:ring-ai-blue/20",
            errors.institutionName && "border-error/50",
          )}
        />
        {errors.institutionName && <p className="text-xs text-error">{errors.institutionName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary tracking-wide uppercase">
          Email
        </label>
        <input
          type="email"
          {...register("email")}
          placeholder="jane@institution.edu"
          className={cn(
            "w-full h-11 px-4 rounded-button text-sm",
            "bg-glass-light border border-glass-border text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:border-ai-blue/50 focus:ring-1 focus:ring-ai-blue/20",
            errors.email && "border-error/50",
          )}
        />
        {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary tracking-wide uppercase">
          Password
        </label>
        <PasswordInput
          {...register("password")}
          placeholder="Create a strong password"
          showStrength
          value={password}
          error={errors.password?.message}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary tracking-wide uppercase">
          Confirm Password
        </label>
        <PasswordInput
          {...register("confirmPassword")}
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message}
        />
      </div>

      <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full justify-center">
        Create Account
      </Button>

      <p className="text-xs text-text-muted text-center">
        By creating an account, you agree to our{" "}
        <a href="#" className="text-ai-blue hover:underline">Terms</a>
        {" "}and{" "}
        <a href="#" className="text-ai-blue hover:underline">Privacy Policy</a>
      </p>
    </form>
  );
}
