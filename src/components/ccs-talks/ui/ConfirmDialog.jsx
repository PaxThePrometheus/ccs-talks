"use client";

import { useEffect } from "react";
import { useAppState } from "../state/AppState";

/**
 * Generic confirm dialog used for destructive / commitment actions
 * (e.g. Sign out). Theme-aware, escape-to-cancel.
 */
export function ConfirmDialog({
  open,
  title = "Are you sure?",
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "warn",
  onConfirm,
  onCancel,
}) {
  const { tokens } = useAppState();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const danger = tone === "warn";

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }} />
      <div
        style={{
          position: "relative",
          width: "min(440px, 96vw)",
          borderRadius: 18,
          border: `1px solid ${tokens.cardBorder}`,
          background: tokens.cardBg,
          backdropFilter: "blur(16px)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
          color: tokens.text,
          padding: "20px 22px",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 18, color: tokens.textStrong, letterSpacing: "-0.3px" }}>{title}</div>
        {body && <div style={{ marginTop: 10, color: tokens.textMuted, fontSize: 13.5, lineHeight: 1.55 }}>{body}</div>}

        <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              border: `1px solid ${tokens.border}`,
              background: tokens.surface,
              color: tokens.text,
              padding: "9px 14px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              border: `1px solid ${danger ? "rgba(255,80,110,0.45)" : tokens.borderStrong}`,
              background: danger
                ? "linear-gradient(135deg, #c0002a, #8b0020)"
                : "linear-gradient(135deg, #6b2c91, #2c1f5b)",
              color: "#fff",
              padding: "9px 14px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 13,
              boxShadow: danger ? "0 12px 28px rgba(155,0,40,0.30)" : "none",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
