import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}