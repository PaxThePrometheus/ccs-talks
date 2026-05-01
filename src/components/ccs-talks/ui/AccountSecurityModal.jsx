"use client";

import { useState } from "react";

export function AccountSecurityModal({ open, onCancel, onSubmit }) {
  const [tab, setTab] = useState("password");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 540, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }} />

      <div
        className="ccs-scroll"
        style={{
          position: "relative",
          width: "min(680px, 96vw)",
          maxHeight: "min(86vh, 760px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,0,8,0.78)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>Account security</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={btn("ghost")}>Close</button>
          </div>
        </div>

        <div style={{ padding: "10px 16px", display: "flex", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            ["password", "Password"],
            ["2fa", "Two-factor"],
            ["sessions", "Sessions"],
            ["data", "Your data"],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={pill(tab === k)}>{label}</button>
          ))}
        </div>

        <div style={{ padding: 16 }}>
          {tab === "password" && (
            <Section title="Change password" hint="Use a strong, unique password.">
              <Field label="Current password"><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} style={inp()} /></Field>
              <Field label="New password"><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} style={inp()} /></Field>
              <Field label="Confirm new password"><input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} style={inp()} /></Field>
              <div style={{ marginTop: 10 }}>
                <button onClick={() => onSubmit?.({ kind: "password", value: pw })} style={btn("solid")}>Update password</button>
              </div>
            </Section>
          )}

          {tab === "2fa" && (
            <Section title="Two-factor authentication" hint="Not wired in CCS Talks yet.">
              <div style={{ color: "rgba(240,220,220,0.74)", fontSize: 13, lineHeight: 1.55 }}>
                Multi-factor enrollment and backup codes aren&apos;t available in this app build. Use your campus SSO or contact an administrator if you need MFA mandated on your identity provider.
              </div>
              <button type="button" disabled style={{ ...btn("ghost"), marginTop: 10, opacity: 0.5, cursor: "not-allowed" }}>
                Coming when auth supports it
              </button>
            </Section>
          )}

          {tab === "sessions" && (
            <Section title="Active sessions" hint="Per-device session listing is not connected.">
              <div style={{ color: "rgba(240,220,220,0.74)", fontSize: 13, lineHeight: 1.55 }}>
                You can revoke this browser session via <strong>Sign out</strong> on your profile. Remote sign-out everywhere requires server-side session tables that this screen does not read yet.
              </div>
            </Section>
          )}

          {tab === "data" && (
            <Section title="Your data" hint="Export or delete your CCS Talks data.">
              <Row label="Download a copy of your data">
                <button style={btn("ghost")}>Request export</button>
              </Row>
              <Row label="Delete account">
                <button style={{ ...btn("ghost"), color: "#ff7d99", borderColor: "rgba(255,125,153,0.40)" }}>Delete…</button>
              </Row>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div>
      <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.2px" }}>{title}</div>
      {hint && <div style={{ color: "rgba(240,220,220,0.6)", fontSize: 12, marginTop: 4 }}>{hint}</div>}
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.06)", gap: 10 }}>
      <div style={{ color: "rgba(240,220,220,0.85)", fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 8 }}>
      <div style={{ color: "rgba(240,220,220,0.7)", fontSize: 12, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function inp() {
  return {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
    color: "#fff",
    padding: "10px 12px",
    outline: "none",
    fontSize: 13,
  };
}

function pill(active) {
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.90)",
    padding: "8px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  };
}

function btn(kind) {
  if (kind === "solid") {
    return {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "linear-gradient(135deg, rgba(255,96,128,0.28), rgba(155,0,40,0.55))",
      color: "#fff",
      padding: "9px 12px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 850,
      fontSize: 13,
    };
  }
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.88)",
    padding: "9px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 750,
    fontSize: 13,
  };
}
