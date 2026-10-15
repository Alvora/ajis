import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format dates cleanly (YYYY-MM-DD or ISO) as DD/MM/YYYY without timezone day shifts.
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const cleanStr = String(dateStr).trim();
  if (!cleanStr) return '-';

  // Handle YYYY-MM-DD or YYYY-MM-DDTHH:...
  const ymdMatch = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day}/${month}/${year}`;
  }

  // Handle DD/MM/YYYY already formatted
  const dmyMatch = cleanStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) return cleanStr;

  const d = new Date(cleanStr);
  if (isNaN(d.getTime())) return cleanStr;
  return d.toLocaleDateString('fr-FR');
}
