"use client";

import { useEffect, useMemo } from "react";

export function MiniProfilePreview({ visible, user, anchorRect, onRequestClose, onMouseEnter, onMouseLeave }) {
  const pos = useMemo(() => {
    if (!anchorRect) return null;
    const gap = 10;
    const width = 320;
    const height = 210;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;

    let left = Math.min(vw - width - 16, Math.max(16, anchorRect.left));
    let top = anchorRect.bottom + gap;
    if (top + height > vh - 16) top = anchorRect.top - height - gap;
    top = Math.max(16, Math.min(vh - height - 16, top));
    return { left, top, width };
  }, [anchorRect]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === "Escape") onRequestClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onRequestClose]);

  if (!visible || !user || !pos) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: pos.width,
        zIndex: 200,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(20,0,8,0.60)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 22px 70px rgba(0,0,0,0.45)",
        overflow: "hidden",
      }}
      onMouseEnter={() => onMouseEnter?.()}
      onMouseLeave={() => onMouseLeave?.()}
    >
      <div
        style={{
          height: 76,
          background:
            "radial-gradient(420px 140px at 70% 10%, rgba(255,96,128,0.20), transparent 62%), radial-gradient(420px 140px at 20% 80%, rgba(155,0,40,0.24), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0))",
        }}
      />
      <div style={{ padding: "12px 14px 14px", marginTop: -22 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.60))",
              boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.3px", lineHeight: 1.1 }}>{user.name}</div>
            <div style={{ marginTop: 2, color: "rgba(240,220,220,0.65)", fontSize: 12 }}>@{user.handle}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Pill>{user.status}</Pill>
            <Pill>{user.year}</Pill>
          </div>
        </div>

        <div style={{ marginTop: 10, color: "rgba(240,220,220,0.72)", fontSize: 12, lineHeight: 1.55 }}>
          {user.program} · {user.college}
        </div>
        <div style={{ marginTop: 6, color: "rgba(240,220,220,0.62)", fontSize: 12, lineHeight: 1.55 }}>{user.bio}</div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(user.badges || []).slice(0, 3).map((b) => (
            <Pill key={b} tone="badge">
              {b}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone }) {
  const bg = tone === "badge" ? "rgba(80,0,26,0.45)" : "rgba(255,255,255,0.06)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: bg,
        color: "rgba(255,255,255,0.82)",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

