"use client";

import { useState } from "react";
import { adminTheme as t, btn, card, field, input, link, page } from "./adminUi";

export function AdminRegisterForm({ bootstrap = false, inviteRequired = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e?.preventDefault?.();
    setError("");
    if (!name.trim()) return setError("Please enter your full name.");
    if (password.length < 10) return setError("Admin password must be at least 10 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (inviteRequired && !inviteCode.trim()) return setError("Invite code is required.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name.trim(), inviteCode: inviteCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not register administrator.");
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
        <h1 style={{ fontSize: 26, fontWeight: 950, letterSpacing: "-0.4px", margin: "8px 0 4px", color: t.textStrong }}>
          {bootstrap ? "Create the first administrator" : "Register a new administrator"}
        </h1>
        <p style={{ color: t.muted, fontSize: 13, margin: "0 0 18px", lineHeight: 1.5 }}>
          {bootstrap
            ? "No admin exists yet. The first account created here owns the operations console and can promote others later."
            : inviteRequired
              ? "Self-registration is gated behind an invite code (CCS_ADMIN_INVITE). Existing admins can also promote any account from the console."
              : "Self-registration is currently disabled. Ask an existing admin to promote your account."}
        </p>

        <label style={field}>
          <span>Full name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Juan Dela Cruz" style={input} />
        </label>
        <label style={field}>
          <span>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@fatima.edu.ph" style={input} />
        </label>
        <label style={field}>
          <span>Password (min 10 characters)</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
        </label>
        <label style={field}>
          <span>Confirm password</span>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} style={input} />
        </label>
        {inviteRequired && !bootstrap && (
          <label style={field}>
            <span>Invite code</span>
            <input required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Provided by an existing admin" style={input} />
          </label>
        )}

        {error && <div style={{ marginTop: 10, color: "#ff7d99", fontSize: 12, fontWeight: 800 }}>{error}</div>}

        <button type="submit" disabled={submitting} style={{ ...btn("solid"), width: "100%", marginTop: 14, opacity: submitting ? 0.7 : 1, cursor: submitting ? "wait" : "pointer" }}>
          {submitting ? "Registering…" : bootstrap ? "Create administrator account" : "Register administrator"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, gap: 10, fontSize: 12 }}>
          <a href="/admin/login" style={link}>Already have an admin account?</a>
          <a href="/" style={{ ...link, color: t.muted }}>← Back to forum</a>
        </div>
      </form>
    </main>
  );
}
