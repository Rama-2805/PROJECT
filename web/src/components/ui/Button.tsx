"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import { buttonHover } from "@/lib/animations";

/* ─── Button Variants ─────────────────────────────────────────── */
const buttonVariants = cva(
  [
    "group relative inline-flex items-center justify-center gap-2",
    "rounded-button font-medium text-sm",
    "transition-all duration-300 ease-smooth",
    "focus-visible:outline-2 focus-visible:outline-ai-blue focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "no-select",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-gradient-to-r from-ai-blue to-ai-purple text-white",
          "shadow-lg shadow-ai-blue/20",
          "hover:shadow-xl hover:shadow-ai-purple/30",
          "hover:brightness-110",
          "active:brightness-90",
        ].join(" "),
        secondary: [
          "glass",
          "text-text-primary",
          "hover:bg-glass-medium",
          "active:bg-glass-heavy",
          "border border-glass-border",
        ].join(" "),
        ghost: [
          "bg-transparent text-text-secondary",
          "hover:bg-glass-light hover:text-text-primary",
          "active:bg-glass-medium",
        ].join(" "),
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

/* ─── Loading Spinner ─────────────────────────────────────────── */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ─── Types ───────────────────────────────────────────────────── */
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a loading spinner and disables interaction */
  loading?: boolean;
  /** Icon to show before the label */
  leftIcon?: ReactNode;
  /** Icon to show after the label */
  rightIcon?: ReactNode;
}

/* ─── Component ───────────────────────────────────────────────── */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant,
      size,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        variants={buttonHover}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        {...(props as HTMLMotionProps<"button">)}
      >
        {/* AI gradient shimmer overlay on primary */}
        {variant === "primary" && !isDisabled && (
          <span
            className="absolute inset-0 rounded-button opacity-0
                       bg-gradient-to-r from-transparent via-white/10 to-transparent
                       group-hover:opacity-100 transition-opacity duration-500
                       -translate-x-full group-hover:translate-x-full
                       pointer-events-none"
            aria-hidden="true"
          />
        )}

        {loading ? (
          <LoadingSpinner />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}

        {children}

        {!loading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
