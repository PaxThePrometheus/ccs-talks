// CCS Talks design tokens.
// Light + Dark are intentionally close-cousined so layout/effects stay consistent.

const dark = {
  appBg: "#1a0008",
  surface: "rgba(30,0,12,0.55)",
  surfaceStrong: "rgba(30,0,12,0.75)",
  surfaceAlt: "rgba(80,0,26,0.45)",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.18)",
  divider: "rgba(255,255,255,0.10)",
  text: "#f4ecec",
  textStrong: "#ffffff",
  textMuted: "rgba(240,220,220,0.70)",
  textSubtle: "rgba(240,220,220,0.55)",
  accent: "#ff6080",
  accentStrong: "#ff3a6e",
  inputBg: "rgba(0,0,0,0.22)",
  inputBorder: "rgba(255,255,255,0.12)",
  cardBg: "rgba(80,0,26,0.55)",
  cardBorder: "rgba(180,60,80,0.25)",
};

const light = {
  appBg: "#fff5f7",
  surface: "rgba(255,255,255,0.78)",
  surfaceStrong: "rgba(255,255,255,0.92)",
  surfaceAlt: "rgba(255,224,232,0.65)",
  border: "rgba(60,0,20,0.14)",
  borderStrong: "rgba(60,0,20,0.22)",
  divider: "rgba(60,0,20,0.10)",
  text: "#2a0010",
  textStrong: "#1a0008",
  textMuted: "rgba(60,0,20,0.62)",
  textSubtle: "rgba(60,0,20,0.45)",
  accent: "#c0002a",
  accentStrong: "#9b0028",
  inputBg: "rgba(255,255,255,0.85)",
  inputBorder: "rgba(60,0,20,0.16)",
  cardBg: "rgba(255,255,255,0.82)",
  cardBorder: "rgba(60,0,20,0.12)",
};

export const THEMES = { dark, light };

// Backwards-compat: many files still import `THEME`. We keep a default that
// matches dark mode for layout, but read actual colors via `useTheme()` where
// dynamic mode is needed.
export const THEME = {
  colors: dark,
  font: { family: "var(--font-sans)", displayFamily: "var(--font-sans)" },
  radii: { sm: 8, md: 12, lg: 16, xl: 20 },
};

export function getThemeTokens(mode) {
  return mode === "light" ? light : dark;
}

export const styles = {
  root: {
    fontFamily: "var(--font-sans)",
    minHeight: "100vh",
    background: dark.appBg,
    color: dark.text,
    overflowX: "hidden",
  },
  canvas: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
    pointerEvents: "none",
    opacity: 0.9,
  },
  page: { position: "relative", zIndex: 1 },
};
