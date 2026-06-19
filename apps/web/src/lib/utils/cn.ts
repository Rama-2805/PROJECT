import { type ClassValue, clsx } from "clsx";

/**
 * Merges Tailwind CSS classes with conditional logic.
 * Combines clsx for conditional class names and proper Tailwind conflict resolution.
 */ 
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
