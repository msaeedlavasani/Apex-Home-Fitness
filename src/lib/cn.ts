import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn
 * ---
 * Merge Tailwind class names with `clsx` semantics and let `tailwind-merge`
 * resolve conflicts (last class wins). Standard helper for design-system
 * components so callers can override styling via `className`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default cn;
