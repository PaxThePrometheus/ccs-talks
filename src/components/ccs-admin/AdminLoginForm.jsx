"use client";

import { useState } from "react";
import { adminTheme as t, btn, card, field, input, link, page } from "./adminUi";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e?.preventDefault?.();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Invalid email or password.");
        return;
      }
      window.location.href = "/admin";
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={page}>
      <form onSubmit={submit} style={card}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", color: t.muted }}>CCS TALKS · ADMIN</div>
        <h1 style={{ fontSize: 26, fontWeight: 950, letterSpacing: "-0.4px", margin: "8px 0 4px", color: t.textStrong }}>Sign in to the operations console</h1>
        <p style={{ color: t.muted, fontSize: 13, margin: "0 0 18px" }}>Use the admin or moderator account that owns this CCS Talks deployment.</p>

        <label style={field}>
          <span>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@fatima.edu.ph" style={input} />
        </label>
        <label style={field}>
          <span>Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
        </label>

        {error && <div style={{ marginTop: 10, color: "#ff7d99", fontSize: 12, fontWeight: 800 }}>{error}</div>}

        <button type="submit" disabled={submitting} style={{ ...btn("solid"), width: "100%", marginTop: 14, opacity: submitting ? 0.7 : 1, cursor: submitting ? "wait" : "pointer" }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginTop: 14, gap: 10, fontSize: 12 }}>
          <a href="/admin/register" style={link}>Need an admin account?</a>
          <a href="/" style={{ ...link, color: t.muted }}>← Back to forum</a>
        </div>
      </form>
    </main>
  );
}
