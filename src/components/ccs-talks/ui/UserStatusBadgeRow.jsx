"use client";

import { statusBadgeDisplayLabels } from "@/lib/ccs/statusBadges";

/** Staff status / recognition chips next to handles (cyan-tinted, not vanity badge registry colours). */
export function UserStatusBadgeRow({
  user,
  gap = 6,
  dense,
  chromed,
  tokens,
  isLight,
}) {
  const labels = statusBadgeDisplayLabels(user);
  if (!labels.length) return null;

  const isModal = chromed === "modalDark";

  const base = dense ? { padding: "2px 8px", fontSize: isModal ? 10 : 11, fontWeight: 800 } : { padding: "3px 9px", fontSize: 11, fontWeight: 850 };

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap, verticalAlign: "middle" }}>
      {labels.map((label) =>
        isModal ? (
          <span
            key={label}
            style={{
              ...base,
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              whiteSpace: "nowrap",
              border: "1px solid rgba(120,208,232,0.35)",
              background: "linear-gradient(135deg, rgba(80,220,255,0.12), rgba(40,140,220,0.08))",
              color: "rgba(230,246,255,0.95)",
            }}
          >
            {label}
          </span>
        ) : (
          <span
            key={label}
            style={{
              ...base,
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              whiteSpace: "nowrap",
              border: isLight ? "1px solid rgba(20,130,170,0.28)" : "1px solid rgba(120,200,238,0.30)",
              background: isLight ? "rgba(214,239,247,0.65)" : "linear-gradient(135deg, rgba(90,210,248,0.14), rgba(40,140,210,0.10))",
              color: tokens?.textStrong || (isLight ? "#0a3442" : "rgba(230,246,255,0.95)"),
            }}
          >
            {label}
          </span>
        ),
      )}
    </span>
  );
}
