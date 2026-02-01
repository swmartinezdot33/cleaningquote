/** Normalize to 6-digit hex (#rrggbb). Accepts #rrggbb or #rrggbbaa, trims; returns null if invalid. */
export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  if (/^#[0-9A-Fa-f]{8}$/.test(s)) return s.slice(0, 7);
  return null;
}
