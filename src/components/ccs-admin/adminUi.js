/** Shared inline styles + tokens for the standalone /admin sub-app. */

export const adminTheme = {
  bg: "var(--admin-bg)",
  surface: "var(--admin-surface)",
  surfaceAlt: "var(--admin-soft)",
  border: "var(--admin-border)",
  borderStrong: "var(--admin-border)",
  text: "var(--admin-text)",
  textStrong: "var(--admin-text)",
  muted: "var(--admin-muted)",
  subtle: "var(--admin-muted)",
  accent: "var(--admin-accent)",
  accentDeep: "var(--admin-wine)",
  warn: "var(--admin-warn)",
  good: "var(--admin-good)",
  bad: "var(--admin-danger)",
};

export const page = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "max(2rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 12px)) max(2rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 12px))",
  background: adminTheme.bg,
};

export const card = {
  width: "100%",
  maxWidth: 460,
  background: adminTheme.surface,
  border: `1px solid ${adminTheme.border}`,
  borderRadius: 18,
  padding: "1.75rem 1.75rem 1.5rem",
  color: adminTheme.text,
};

export const field = { display: "flex", flexDirection: "column", gap: 6, marginTop: 10, fontSize: 12, fontWeight: 800, color: adminTheme.text };
export const input = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${adminTheme.border}`,
  borderRadius: 12,
  padding: "11px 14px",
  color: adminTheme.text,
  fontSize: 14,
  fontWeight: 500,
};

export const link = { color: adminTheme.accent, fontWeight: 800, textDecoration: "none" };

export function btn(kind = "ghost") {
  if (kind === "solid") {
    return {
      border: `1px solid ${adminTheme.borderStrong}`,
      background: "var(--admin-wine)",
      color: "#fff4f8",
      padding: "10px 14px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 550,
      fontSize: 13,
      letterSpacing: "-0.1px",
    };
  }
  if (kind === "danger") {
    return {
      border: `1px solid rgba(255,80,100,0.40)`,
      background: "rgba(255,80,100,0.10)",
      color: adminTheme.bad,
      padding: "8px 12px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 12,
    };
  }
  return {
    border: `1px solid ${adminTheme.border}`,
    background: "rgba(255,255,255,0.04)",
    color: adminTheme.text,
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  };
}

export function tag(tone = "neutral") {
  const palette =
    tone === "warn"
      ? { bg: "rgba(255,180,80,0.14)", color: "#ffb05a", border: "rgba(255,180,80,0.30)" }
      : tone === "good"
        ? { bg: "rgba(120,220,160,0.16)", color: "#7be0a0", border: "rgba(120,220,160,0.30)" }
        : tone === "bad"
          ? { bg: "rgba(255,80,100,0.12)", color: "#ff7d99", border: "rgba(255,80,100,0.30)" }
          : { bg: "rgba(255,255,255,0.06)", color: adminTheme.text, border: adminTheme.border };
  return {
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 900,
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.color,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };
}

export const panel = {
  borderRadius: 16,
  border: `1px solid ${adminTheme.border}`,
  background: adminTheme.surface,

  /** Allow anchored tooltips (fixed to body); clip only where needed inside rows. */
  overflow: "visible",
};
export const panelHeader = { padding: "12px 16px", borderBottom: `1px solid ${adminTheme.border}`, fontWeight: 550, color: adminTheme.textStrong, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 };
export const row = { padding: "12px 16px", borderTop: `1px solid ${adminTheme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
