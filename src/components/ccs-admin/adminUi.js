/** Shared inline styles + tokens for the standalone /admin sub-app. */

export const adminTheme = {
  bg: "#0a0006",
  surface: "rgba(28,0,12,0.72)",
  surfaceAlt: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.18)",
  text: "#f4ecec",
  textStrong: "#ffffff",
  muted: "rgba(240,220,220,0.62)",
  subtle: "rgba(240,220,220,0.40)",
  accent: "#ff6080",
  accentDeep: "#9b0028",
  warn: "#ffb05a",
  good: "#7be0a0",
  bad: "#ff7d99",
};

export const page = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "max(2rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 12px)) max(2rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 12px))",
  background: "radial-gradient(circle at 25% 18%, rgba(155,0,40,0.40), transparent 55%), radial-gradient(circle at 78% 82%, rgba(60,0,30,0.55), transparent 55%), #0a0006",
};

export const card = {
  width: "100%",
  maxWidth: 460,
  background: "rgba(20,0,10,0.78)",
  border: `1px solid ${adminTheme.border}`,
  borderRadius: 18,
  padding: "1.75rem 1.75rem 1.5rem",
  backdropFilter: "blur(14px)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
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
  outline: "none",
  fontWeight: 500,
};

export const link = { color: adminTheme.accent, fontWeight: 800, textDecoration: "none" };

export function btn(kind = "ghost") {
  if (kind === "solid") {
    return {
      border: `1px solid ${adminTheme.borderStrong}`,
      background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.65))",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 13,
      letterSpacing: "-0.1px",
    };
  }
  if (kind === "danger") {
    return {
      border: `1px solid rgba(255,80,100,0.40)`,
      background: "rgba(255,80,100,0.10)",
      color: "#ff97aa",
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
  backdropFilter: "blur(12px)",
  /** Allow anchored tooltips (fixed to body); clip only where needed inside rows. */
  overflow: "visible",
};
export const panelHeader = { padding: "12px 16px", borderBottom: `1px solid ${adminTheme.border}`, fontWeight: 900, color: adminTheme.textStrong, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 };
export const row = { padding: "12px 16px", borderTop: `1px solid ${adminTheme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" };
