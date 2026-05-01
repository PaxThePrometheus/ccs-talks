"use client";

import { useState } from "react";
import * as api from "../api/ccsApi";
import { APP_CONFIG } from "../config/appConfig";
import { useAppState } from "../state/AppState";

export function ForgotPasswordScreen({ setPage }) {
  const { tokens } = useAppState();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError("");
    setMessage("");
    if (!/^[^\s@]+@[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      const out = await api.requestPasswordReset(email.trim());
      setMessage(typeof out.message === "string" ? out.message : "Check your inbox for next steps.");
    } catch (e) {
      setError(e.message || "Could not send reset request.");
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
          <h1 style={{ fontSize: 36, lineHeight: 1.08, fontWeight: 950, letterSpacing: "-1px", margin: "12px 0 10px", color: tokens.textStrong }}>Forgot password</h1>
          <p style={{ fontSize: 15, color: tokens.textMuted, margin: 0, lineHeight: 1.55 }}>
            Enter the email on your CCS Talks account. If email delivery is configured, you will receive a reset link shortly.
          </p>
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
          <label style={{ display: "block", marginBottom: 12 }}>
            <div style={{ color: tokens.text, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Email</div>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@student.fatima.edu.ph" style={field} />
          </label>
          {error ? <div style={{ color: "#ff7d99", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>{error}</div> : null}
          {message ? <div style={{ color: "#7be0a0", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{message}</div> : null}
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
            }}
          >
            {submitting ? "…" : "Send reset link"}
          </button>
          <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: tokens.textMuted }}>
            <span onClick={() => setPage("login")} style={{ color: tokens.accent, cursor: "pointer", fontWeight: 800 }}>
              ← Back to sign in
            </span>
          </p>
          <p style={{ fontSize: 11, color: tokens.textSubtle, marginTop: 10, lineHeight: 1.45 }}>
            Operators: set <code style={{ opacity: 0.9 }}>RESEND_API_KEY</code> and{" "}
            <code style={{ opacity: 0.9 }}>CCS_PUBLIC_URL</code> (or rely on Vercel URL) so delivery works in production. Without them, reset links may only appear in server logs.
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
