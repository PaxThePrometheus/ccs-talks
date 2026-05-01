/** Normalize badge label → accent colour map from site settings. */

export function sanitizeBadgeColorsInput(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;

  for (const [k, v] of Object.entries(raw)) {
    const label = String(k || "").trim().slice(0, 64);
    if (!label) continue;
    const hex = normalizeHexColor(v);
    if (hex) out[label] = hex;
  }
  return out;
}

export function normalizeHexColor(v) {
  const s = String(v || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toUpperCase().slice(0, 7);
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    const r = s[1],
      g = s[2],
      b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "";
}

/**
 * Lookup colour for badge text (exact label, then case-insensitive scan).
 */
export function badgeAccentForLabel(map, label) {
  if (!label) return "";
  const s = String(label).trim();
  if (!map || typeof map !== "object") return "";
  if (map[s]) return map[s];
  const low = s.toLowerCase();
  for (const [k, c] of Object.entries(map)) {
    if (String(k).trim().toLowerCase() === low) return c;
  }
  return "";
}

export function badgePillColors(accentHex, isLight, tokens) {
  if (!accentHex) {
    return {
      color: tokens.text,
      border: tokens.border,
      background: tokens.surfaceAlt,
    };
  }
  return {
    color: accentHex,
    border: `${accentHex}88`,
    background: isLight ? `${accentHex}18` : `${accentHex}22`,
  };
}
