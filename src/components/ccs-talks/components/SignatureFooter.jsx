"use client";

import { Icon } from "../ui/Icon";

export function SignatureFooter({ user, tokens, isLight, compact = false }) {
  if (!user) return null;
  const sig = typeof user.signature === "string" ? user.signature.trim() : "";
  const img = typeof user.signatureImage === "string" ? user.signatureImage.trim() : "";
  const link = typeof user.signatureLink === "string" ? user.signatureLink.trim() : "";
  if (!sig && !img && !link) return null;

  const border = isLight ? "rgba(60,0,20,0.12)" : "rgba(255,255,255,0.10)";
  const muted = tokens.textMuted;

  return (
    <div
      style={{
        marginTop: compact ? 8 : 10,
        paddingTop: compact ? 8 : 10,
        borderTop: `1px dashed ${border}`,
        fontSize: compact ? 11 : 12,
        color: muted,
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: sig || img ? 6 : 0, fontWeight: 800, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: tokens.textSubtle }}>
        <Icon name="pencil" size={12} style={{ opacity: 0.7 }} />
        Signature
      </div>
      {sig ? (
        <div style={{ whiteSpace: "pre-wrap", color: tokens.text, fontWeight: 500 }}>{sig}</div>
      ) : null}
      {img ? (
        <div style={{ marginTop: 6 }}>
          <img
            src={img}
            alt=""
            style={{ maxHeight: compact ? 80 : 120, maxWidth: "100%", borderRadius: 8, objectFit: "contain", border: `1px solid ${border}` }}
          />
        </div>
      ) : null}
      {link ? (
        <div style={{ marginTop: 6 }}>
          <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: tokens.accent, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="link" size={12} /> Link
          </a>
        </div>
      ) : null}
    </div>
  );
}
