import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Inserts comma thousands separators into each run of 4+ digits in free-form text.
 * A bare 4-digit run in 1900–2099 is left as-is (e.g. years in labels).
 */
export function formatThousandsInText(text: string): string {
  if (!text) return text;
  return text.replace(/\d{4,}/g, (run) => {
    const digits = run.replace(/,/g, "");
    if (!/^\d+$/.test(digits)) return run;
    const n = Number(digits);
    if (!Number.isFinite(n)) return run;
    if (digits.length === 4 && n >= 1900 && n <= 2099) return run;
    return n.toLocaleString("en-US");
  });
}
