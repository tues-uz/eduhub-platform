/** e.g. rifkrifk → Rifkrifk, john doe → John Doe, dosen-2 → Dosen-2 */
export function formatDisplayPersonName(name: string): string {
  const t = name.trim();
  if (!t || t === "—") return t;
  const titled = t.replace(/(^|[\s-])([a-z])/g, (_, sep, letter) => sep + letter.toUpperCase());
  const first = titled.charAt(0);
  if (first && first === first.toLowerCase() && first !== first.toUpperCase()) {
    return first.toUpperCase() + titled.slice(1);
  }
  return titled;
}
