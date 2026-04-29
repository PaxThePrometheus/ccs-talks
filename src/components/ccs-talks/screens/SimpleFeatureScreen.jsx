"use client";

import { useAppState } from "../state/AppState";

export function SimpleFeatureScreen({ title, subtitle }) {
  const { tokens } = useAppState();
  return (
    <div
      className="ccs-scroll"
      style={{
        position: "fixed",
        top: 0,
        left: "var(--ccs-shell-left)",
        right: 0,
        bottom: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "1.75rem 2rem 2.5rem",
        borderLeft: `1px solid ${tokens.divider}`,
        color: tokens.text,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ borderRadius: 20, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(14px)", padding: 18 }}>
          <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", fontSize: 18 }}>{title}</div>
          <div style={{ marginTop: 6, color: tokens.textMuted, fontSize: 13, lineHeight: 1.6 }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
