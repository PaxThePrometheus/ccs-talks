export const THEME = {
  colors: {
    crimson: "#7a0020",
    crimsonDark: "#50001a",
    crimsonMid: "#9b0028",
    text: "#f0e6e6",
    textStrong: "#f5ede0",
    textMuted: "rgba(240,220,220,0.7)",
    cardBg: "rgba(80,0,26,0.55)",
    cardBorder: "rgba(180,60,80,0.25)",
    inputBg: "rgba(30,0,10,0.7)",
    divider: "rgba(255,255,255,0.12)",
  },
  font: {
    family: "var(--font-sans)",
    displayFamily: "var(--font-sans)",
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
};

export const styles = {
  root: {
    fontFamily: THEME.font.family,
    minHeight: "100vh",
    background: THEME.colors.crimsonDark,
    color: THEME.colors.text,
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

