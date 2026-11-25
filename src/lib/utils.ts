import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatProductName(name?: string): string {
  if (!name) return "";
  return name
    .replace(/\s*\(([0-9.]+\s*(?:gm|g|kg|ml|l|ltr|liter|litre|pcs|box|pkt|packet|bag|bottle)s?)\)\s*$/i, '-$1')
    .toUpperCase();
}
