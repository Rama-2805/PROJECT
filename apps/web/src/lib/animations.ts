import { type Variants, type Transition } from "framer-motion";

/* ─── Shared Transitions ─────────────────────────────────────── */
export const smoothTransition: Transition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1],
};

export const springTransition: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 15,
};

/* ─── Fade In ─────────────────────────────────────────────────── */
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: smoothTransition,
  },
};

export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
};

export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
};

export const fadeInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -24,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
};

export const fadeInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 24,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
};

/* ─── Scale ───────────────────────────────────────────────────── */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
};

export const scaleInBounce: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springBouncy,
  },
};

/* ─── Slide Up ────────────────────────────────────────────────── */
export const slideUp: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/* ─── Container (Stagger Children) ────────────────────────────── */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

/* ─── Card Hover ──────────────────────────────────────────────── */
export const cardHover = {
  rest: {
    scale: 1,
    y: 0,
    transition: smoothTransition,
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: springTransition,
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

/* ─── Button Hover ────────────────────────────────────────────── */
export const buttonHover = {
  rest: { scale: 1 },
  hover: { scale: 1.03, transition: springTransition },
  tap: { scale: 0.97, transition: { duration: 0.1 } },
};

/* ─── Floating Animation ──────────────────────────────────────── */
export const floating: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 4,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "mirror",
    },
  },
};

/* ─── Glow Pulse ──────────────────────────────────────────────── */
export const glowPulse: Variants = {
  animate: {
    boxShadow: [
      "0 0 8px rgba(59,130,246,0.3), 0 0 16px rgba(59,130,246,0.1)",
      "0 0 16px rgba(59,130,246,0.5), 0 0 32px rgba(139,92,246,0.2)",
      "0 0 8px rgba(59,130,246,0.3), 0 0 16px rgba(59,130,246,0.1)",
    ],
    transition: {
      duration: 2.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "mirror",
    },
  },
};

/* ─── Section Entrance ────────────────────────────────────────── */
export const sectionEntrance: Variants = {
  hidden: {
    opacity: 0,
    y: 60,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/* ─── Counter / Number Animation ──────────────────────────────── */
export const counterAnimation: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springBouncy,
  },
};

/* ─── List Item ───────────────────────────────────────────────── */
export const listItem: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition,
  },
};
