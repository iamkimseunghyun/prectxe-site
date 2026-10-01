import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind className 머지 + clsx conditional 처리.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
