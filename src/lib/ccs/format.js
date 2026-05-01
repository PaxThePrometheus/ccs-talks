export function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const a = parts[0][0] || "?";
  const b = parts[parts.length - 1][0] || "?";
  return `${a}${b}`.toUpperCase();
}

export function relativeTime(ms) {
  const t = typeof ms === "number" ? ms : Number(ms);
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 45) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 10) return `${w}w ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
