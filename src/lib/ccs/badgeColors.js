/** Normalize badge label → accent colour map from site settings. */

export const BADGE_REGISTRY_MAX = 48;

/** `badgeRegistry` entry: stable id + display label + hex colour. */
export function sanitizeBadgeRegistryInput(raw) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  const seen = new Set();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = String(item.label ?? "").trim().slice(0, 64);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    const hex = normalizeHexColor(item.color);
    if (!hex) continue;
    seen.add(key);
    const id = String(item.id ?? "").trim().slice(0, 72) || `br_${slugFromLabel(label)}`;
    out.push({ id, label, color: hex });
    if (out.length >= BADGE_REGISTRY_MAX) break;
  }
  return out;
}

function slugFromLabel(label) {
  const s = String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "badge";
}

/** One-time migration from legacy `badgeColors` object to registry rows. */
export function migrateLegacyBadgeColorsToRegistry(colorsMap) {
  const reg = [];
  const seen = new Set();
  if (!colorsMap || typeof colorsMap !== "object") return reg;
  for (const [k, v] of Object.entries(colorsMap)) {
    const label = String(k ?? "").trim().slice(0, 64);
    if (!label) continue;
    const low = label.toLowerCase();
    if (seen.has(low)) continue;
    const hex = normalizeHexColor(v);
    if (!hex) continue;
    seen.add(low);
    reg.push({ id: `br_${slugFromLabel(label)}`, label, color: hex });
    if (reg.length >= BADGE_REGISTRY_MAX) break;
  }
  reg.sort((a, b) => a.label.localeCompare(b.label));
  return reg;
}

export function badgeColorsMapFromRegistry(registry) {
  const map = {};
  if (!Array.isArray(registry)) return map;
  for (const row of registry) {
    if (!row || typeof row !== "object") continue;
    const label = String(row.label ?? "").trim();
    const hex = normalizeHexColor(row.color);
    if (!label || !hex) continue;
    map[label] = hex;
  }
  return map;
}

export function ensureBadgeRegistryAndColors(site) {
  let reg = sanitizeBadgeRegistryInput(site?.badgeRegistry);
  if (!reg.length && site?.badgeColors && typeof site.badgeColors === "object") {
    const legacy = sanitizeBadgeColorsInput(site.badgeColors);
    if (Object.keys(legacy).length) reg = migrateLegacyBadgeColorsToRegistry(legacy);
  }
  return {
    badgeRegistry: reg,
    badgeColors: badgeColorsMapFromRegistry(reg),
  };
}

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
