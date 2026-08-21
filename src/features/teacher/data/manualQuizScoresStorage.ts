export type ManualQuizColumn = {
  id: string;
  title: string;
};

/** Sum draft or saved quiz inputs for column ids (used by quiz matrix UI). */
export function sumManualQuizInputs(
  valuesByColumnId: Record<string, string | number | null | undefined> | undefined,
  columns: ManualQuizColumn[],
): number | null {
  if (columns.length === 0) return null;
  let sum = 0;
  let hasAny = false;
  for (const col of columns) {
    const raw = valuesByColumnId?.[col.id];
    if (raw == null) continue;
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? parseManualQuizScoreInput(raw)
          : null;
    if (n == null) continue;
    sum += n;
    hasAny = true;
  }
  return hasAny ? sum : null;
}

/** Clamp and validate a score for storage. Returns null if empty/invalid. */
export function parseManualQuizScoreInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 10) / 10;
}
