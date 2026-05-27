/** e.g. rifkrifk → Rifkrifk, john doe → John Doe, dosen-2 → Dosen-2, russia 1 → Russia 1 */
function titleCaseDisplayText(text: string): string {
  const t = text.trim();
  if (!t || t === "—") return t;
  const titled = t.replace(/(^|[\s-])([a-z])/g, (_, sep, letter) => sep + letter.toUpperCase());
  const first = titled.charAt(0);
  if (first && first === first.toLowerCase() && first !== first.toUpperCase()) {
    return first.toUpperCase() + titled.slice(1);
  }
  return titled;
}

export function formatDisplayPersonName(name: string): string {
  return titleCaseDisplayText(name);
}

/** Session or class labels entered in lowercase, e.g. russia 1 → Russia 1 */
export function formatDisplayTitle(title: string): string {
  return titleCaseDisplayText(title);
}

/** e.g. John Doe → JD, rifkrifk → RI */
export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
  return "?";
}
