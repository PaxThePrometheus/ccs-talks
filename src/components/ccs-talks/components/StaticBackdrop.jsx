"use client";

/**
 * CSS-only ambient background when animated layers are disabled (reduce motion /
 * simplify visuals). Keeps the same dark/light mood without WebGL/canvas cost.
 */
export function StaticBackdrop({ accent = "#ff6080", light = false }) {
  if (light) {
    return (
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(1200px 900px at 50% -8%, rgba(255,218,226,0.95) 0%, rgba(255,245,247,1) 42%, rgba(255,238,242,1) 100%),
            linear-gradient(180deg, rgba(255,248,249,1) 0%, rgba(255,235,241,1) 100%)
          `,
        }}
      />
    );
  }
  const a = accent || "#ff6080";
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: `
          radial-gradient(100% 70% at 50% -15%, ${a}2e 0%, rgba(42,14,26,0.55) 38%, rgb(14,7,11) 100%),
          radial-gradient(900px 700px at 80% 100%, rgba(160,28,74,0.14) 0%, transparent 52%),
          linear-gradient(180deg, rgb(18,9,13) 0%, rgb(8,5,12) 100%)
        `,
      }}
    />
  );
}
