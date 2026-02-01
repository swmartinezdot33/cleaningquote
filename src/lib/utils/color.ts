/**
 * Normalize to 6-digit hex (#rrggbb).
 * Accepts: #rrggbb, #rrggbbaa, #rgb, rrggbb, rgb (with or without #).
 * Returns null only if truly invalid.
 */
export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let s = value.trim();
  
  // Remove # if present
  if (s.startsWith('#')) s = s.slice(1);
  
  // 6-digit hex (rrggbb)
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`;
  
  // 8-digit hex with alpha (rrggbbaa) - strip alpha
  if (/^[0-9A-Fa-f]{8}$/.test(s)) return `#${s.slice(0, 6)}`;
  
  // 3-digit shorthand (rgb) - expand to 6-digit
  if (/^[0-9A-Fa-f]{3}$/.test(s)) {
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  }
  
  // 4-digit shorthand with alpha (rgba) - expand and strip alpha
  if (/^[0-9A-Fa-f]{4}$/.test(s)) {
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  }
  
  return null;
}
