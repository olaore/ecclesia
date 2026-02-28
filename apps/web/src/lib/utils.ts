import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility to merge Tailwind classes using clsx and tailwind-merge.
 * This ensures that conditional classes are handled correctly and 
 * conflicting Tailwind classes are resolved.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
