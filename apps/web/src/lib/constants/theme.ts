/**
 * SmartCampus AI — Premium Design System Tokens
 *
 * Centralized theme constants for the AI-powered campus management platform.
 * All colors, spacing, typography, and animation tokens are defined here
 * to ensure consistency across the entire application.
 */

/* ─── Background Colors ──────────────────────────────────────── */
export const colors = {
  bg: {
    primary: "#030712",    // Deep Space Black
    secondary: "#111827",  // Dark Navy
    tertiary: "#1F2937",   // Muted Dark
  },

  glass: {
    light: "rgba(255, 255, 255, 0.08)",
    medium: "rgba(255, 255, 255, 0.12)",
    heavy: "rgba(255, 255, 255, 0.16)",
    border: "rgba(255, 255, 255, 0.10)",
  },

  accent: {
    blue: "#3B82F6",
    purple: "#8B5CF6",
    cyan: "#06B6D4",
    green: "#10B981",
    orange: "#F59E0B",
    red: "#EF4444",
  },

  text: {
    primary: "#FFFFFF",
    secondary: "#D1D5DB",  /* gray-300 */
    muted: "#6B7280",      /* gray-500 */
    dim: "#9CA3AF",        /* gray-400 */
  },

  gradient: {
    ai: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
    aiHover: "linear-gradient(135deg, #2563EB, #7C3AED)",
    cyanPurple: "linear-gradient(135deg, #06B6D4, #8B5CF6)",
    glassBorder: "linear-gradient(135deg, rgba(59,130,246,0.5), rgba(139,92,246,0.5), rgba(6,182,212,0.5))",
  },
} as const;

/* ─── Typography ─────────────────────────────────────────────── */
export const typography = {
  fontFamily: {
    sans: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
    mono: "var(--font-geist-mono), 'JetBrains Mono', monospace",
  },

  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
    "7xl": "4.5rem",
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

/* ─── Spacing & Layout ───────────────────────────────────────── */
export const layout = {
  maxWidth: {
    container: "1280px",
    content: "896px",
    narrow: "672px",
  },

  padding: {
    container: {
      mobile: "1rem",
      tablet: "1.5rem",
      desktop: "2rem",
    },
    section: {
      mobile: "3rem",
      tablet: "5rem",
      desktop: "7rem",
    },
  },
} as const;

/* ─── Shadows ────────────────────────────────────────────────── */
export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
  glow: {
    blue: "0 0 20px rgba(59, 130, 246, 0.3)",
    purple: "0 0 20px rgba(139, 92, 246, 0.3)",
    cyan: "0 0 20px rgba(6, 182, 212, 0.3)",
  },
} as const;

/* ─── Breakpoints ────────────────────────────────────────────── */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/* ─── Animation Tokens ───────────────────────────────────────── */
export const animation = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    xslow: 750,
  },
  easing: {
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
  blur: {
    subtle: "4px",
    medium: "8px",
    heavy: "12px",
    xheavy: "20px",
  },
} as const;
