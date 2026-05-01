"use client";

import { useMemo, useState } from "react";
import * as api from "../api/ccsApi";
import { APP_CONFIG } from "../config/appConfig";
import { useAppState } from "../state/AppState";

export function ResetPasswordScreen({ setPage }) {
  const { tokens } = useAppState();
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("reset") || "";
  }, []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError("");
    setMessage("");
    if (!token) {
      setError("Missing token in the URL. Open the link from your email again.");
      return;
    }
    if (password.length < 8) {
      setError("Password should be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const out = await api.resetPasswordWithToken(token, password);
      setMessage(typeof out.message === "string" ? out.message : "Password updated.");
    } catch (e) {
      setError(e.message || "Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  const field = inp(tokens);

  return (
    <div className="ccs-stack-tablet" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", paddingTop: 68 }}>
      <aside className="ccs-hide-tablet" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "2rem 3rem", color: tokens.text }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", color: tokens.textMuted }}>{APP_CONFIG.brand.name.toUpperCase()}</div>
          <h1 style={{ fontSize: 36, lineHeight: 1.08, fontWeight: 950, letterSpacing: "-1px", margin: "12px 0 10px", color: tokens.textStrong }}>Set a new password</h1>
          <p style={{ fontSize: 15, color: tokens.textMuted, margin: 0, lineHeight: 1.55 }}>Choose a strong password you have not used elsewhere.</p>
        </div>
      </aside>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem 3rem" }}>
        <div
          style={{
            background: tokens.cardBg,
            border: `1px solid ${tokens.cardBorder}`,
            borderRadius: 18,
            padding: "1.75rem",
            width: "100%",
            maxWidth: 440,
            backdropFilter: "blur(16px)",
            boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
            color: tokens.text,
          }}
        >
          {!token ? (
            <div style={{ color: "#ff7d99", fontSize: 13, fontWeight: 800 }}>This page needs a <code style={{ color: tokens.text }}>?reset=…</code> token from your email.</div>
          ) : (
            <>
              <label style={{ display: "block", marginBottom: 12 }}>
                <div style={{ color: tokens.text, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>New password</div>
                <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} style={field} />
              </label>
              <label style={{ display: "block", marginBottom: 12 }}>
                <div style={{ color: tokens.text, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Confirm</div>
                <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={field} />
              </label>
            </>
          )}
          {error ? <div style={{ color: "#ff7d99", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>{error}</div> : null}
          {message ? (
            <div style={{ color: "#7be0a0", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              {message}{" "}
              <span onClick={() => setPage("login")} style={{ color: tokens.accent, cursor: "pointer", textDecoration: "underline" }}>
                Sign in →
              </span>
            </div>
          ) : null}
          {token ? (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #c0002a, #8b0020)",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                padding: "13px",
                fontSize: 15,
                fontWeight: 900,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.85 : 1,
                marginTop: 4,
              }}
            >
              {submitting ? "…" : "Update password"}
            </button>
          ) : null}
          <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: tokens.textMuted }}>
            <span onClick={() => setPage("login")} style={{ color: tokens.accent, cursor: "pointer", fontWeight: 800 }}>
              ← Back to sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function inp(tokens) {
  return {
    width: "100%",
    boxSizing: "border-box",
    background: tokens.inputBg,
    border: `1px solid ${tokens.inputBorder}`,
    borderRadius: 12,
    padding: "11px 14px",
    color: tokens.text,
    fontSize: 14,
    outline: "none",
  };
}
