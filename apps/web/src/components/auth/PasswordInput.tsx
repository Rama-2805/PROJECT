"use client";

import { useState, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  showStrength?: boolean;
  value?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, showStrength = false, value = "", ...props }, ref) => {
    const [show, setShow] = useState(false);

    const strength = showStrength ? getStrength(value) : null;

    return (
      <div className="space-y-1.5">
        <div className="relative">
          <input
            ref={ref}
            type={show ? "text" : "password"}
            className={cn(
              "w-full h-11 px-4 pr-11 rounded-button text-sm",
              "bg-glass-light border border-glass-border",
              "text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:border-ai-blue/50 focus:ring-1 focus:ring-ai-blue/20",
              "transition-all duration-300",
              error && "border-error/50 focus:border-error",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>

        {error && <p className="text-xs text-error">{error}</p>}

        {strength !== null && value.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    level <= strength.score ? strength.color : "bg-glass-border",
                  )}
                />
              ))}
            </div>
            <p className="text-[10px] text-text-muted">{strength.label}</p>
          </div>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { score: 1, color: "bg-error", label: "Weak" },
    { score: 2, color: "bg-warning", label: "Fair" },
    { score: 3, color: "bg-ai-blue", label: "Good" },
    { score: 4, color: "bg-success", label: "Strong" },
  ];

  return levels[Math.min(score - 1, 3)] || levels[0];
}
