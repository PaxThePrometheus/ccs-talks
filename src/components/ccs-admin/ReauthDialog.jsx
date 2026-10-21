"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminTheme as t, btn, field, input } from "./adminUi";

export function ReauthDialog() {
  const dialog = useRef(null);
  const waiting = useRef(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function open(event) {
      if (waiting.current) { event.detail.resolve(false); return; }
      waiting.current = event.detail.resolve;
      setPassword(""); setCode(""); setError("");
      dialog.current.showModal();
    }
    window.addEventListener("ccs:reauth", open);
    return () => {
      window.removeEventListener("ccs:reauth", open);
      waiting.current?.(false);
      waiting.current = null;
    };
  }, []);

  function finish(ok) {
    const resolve = waiting.current;
    waiting.current = null;
    dialog.current.close();
    setPassword("");
    setCode("");
    resolve?.(ok);
  }

  async function verify(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/auth/reauth", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ password, code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Verification failed. Try again.");
      finish(true);
    } catch (error) { setError(error.message || "Verification failed."); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} aria-labelledby="admin-reauth-title" onCancel={(event) => {
    event.preventDefault(); if (!busy) finish(false);
  }} style={{ maxWidth: 420, width: "calc(100% - 32px)", background: t.bg, color: t.text, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24 }}>
    <form onSubmit={verify}>
      <h2 id="admin-reauth-title" style={{ fontSize: 20 }}>Verify it’s you</h2>
      <p style={{ color: t.muted, fontSize: 14 }}>Enter your password to save this change. Your draft stays open.</p>
      <label style={field}>Password<input name="password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(e) => setPassword(e.target.value)} style={input} /></label>
      <label style={field}>Authenticator or recovery code (if enabled)<input name="code" autoComplete="one-time-code" maxLength={64} value={code} onChange={(e) => setCode(e.target.value)} style={input} /></label>
      {error && <p role="alert" style={{ color: t.bad }}>{error}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button type="submit" disabled={busy} style={btn("solid")}>{busy ? "Verifying…" : "Verify and continue"}</button>
        <button type="button" disabled={busy} onClick={() => finish(false)} style={btn()}>Cancel</button>
      </div>
      <p><Link href="/admin/login" style={{ color: t.accent }}>Sign in again</Link></p>
    </form>
  </dialog>;
}
