"use client";

import { useEffect, useMemo } from "react";
import { badgeAccentForLabel, badgePillColors } from "@/lib/ccs/badgeColors";
import { UserStatusBadgeRow } from "./UserStatusBadgeRow";

const MP_PILL_TOKENS = {
  text: "rgba(255,255,255,0.82)",
  border: "rgba(255,255,255,0.10)",
  surfaceAlt: "rgba(80,0,26,0.45)",
};

export function MiniProfilePreview({ visible, user, anchorRect, badgeColors, onRequestClose, onMouseEnter, onMouseLeave }) {
  const pos = useMemo(() => {
    if (!anchorRect) return null;
    const gap = 10;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const width = Math.min(320, vw - 32);
    const height = 210;

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
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.16)",
              background: user.avatarImage
                ? `url(${user.avatarImage}) center/cover no-repeat`
                : "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.60))",
              boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.3px", lineHeight: 1.1 }}>{user.name}</div>
              <UserStatusBadgeRow user={user} chromed="modalDark" dense gap={4} />
            </div>
            <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ color: "rgba(240,220,220,0.65)", fontSize: 12 }}>@{user.handle}</span>
              <Pill>{user.year}</Pill>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, color: "rgba(240,220,220,0.72)", fontSize: 12, lineHeight: 1.55 }}>
          {user.program} · {user.college}
        </div>
        <div style={{ marginTop: 6, color: "rgba(240,220,220,0.62)", fontSize: 12, lineHeight: 1.55 }}>{user.bio}</div>
        {user.signature ? (
          <div style={{ marginTop: 6, color: "rgba(255,200,210,0.75)", fontSize: 11, lineHeight: 1.45, fontStyle: "italic", whiteSpace: "pre-wrap" }}>
            {String(user.signature).split("\n")[0]}
            {String(user.signature).includes("\n") ? "…" : ""}
          </div>
        ) : null}

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(user.badges || []).slice(0, 3).map((b) => (
            <Pill key={b} tone="badge" badgeColors={badgeColors} badgeLabel={b}>
              {b}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone, badgeColors, badgeLabel }) {
  if (tone === "badge" && badgeLabel) {
    const acc = badgeAccentForLabel(badgeColors || {}, badgeLabel);
    const ps = badgePillColors(acc, false, MP_PILL_TOKENS);
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "6px 10px",
          borderRadius: 999,
          border: `1px solid ${ps.border}`,
          background: ps.background,
          color: ps.color,
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    );
  }

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

