"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { jsonFetch } from "./adminFetch";
import { adminTheme as t, btn, field, input, panel, panelHeader } from "./adminUi";

export function AdminSecurityPane({ onError }) {
  const [status, setStatus] = useState(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    jsonFetch("/api/admin/auth/mfa").then((value) => { if (alive) setStatus(value); }).catch((error) => { if (alive) setFailed(true); onError(error); });
    return () => { alive = false; };
  }, [onError]);
  async function act(method) {
    if (busy) return;
    setBusy(true);
    try {
      const data = await jsonFetch("/api/admin/auth/mfa", { method, body: method === "POST" ? undefined : JSON.stringify({ code }) });
      if (method === "POST") setSecret(data.secret);
      if (method === "PUT") { setCodes(data.recoveryCodes); setSecret(""); }
      if (method === "DELETE") window.location.href = "/admin/login";
      setCode("");
    } catch (error) { onError(error); }
    finally { setBusy(false); }
  }
  return <section style={panel}>
    <header style={panelHeader}>Account security</header>
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      {codes ? <>
        <h2 style={{ fontSize: 18 }}>Save your recovery codes</h2>
        <p>Each code can be used once. Store these securely before leaving this page. Your sessions have been revoked; sign in again with your authenticator after saving the codes.</p>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{codes.join("\n")}</pre>
        <Link href="/admin/login" style={{ color: t.accent }}>Sign in again</Link>
      </> : <>
        {!status && <p>{failed ? "Could not load security settings. Reload to retry." : "Loading security settings…"}</p>}
        {status && <>
          <p>Authenticator protection: <strong>{status.enabled ? "Enabled" : "Not enabled"}</strong></p>
          {!status.configured && <p>Authenticator setup requires configuration by the deployment owner. Your existing administrator account remains active.</p>}
          {!status.enabled && status.configured && !secret && <button disabled={busy} onClick={() => act("POST")} style={btn("solid")}>Set up authenticator</button>}
          {secret && <>
            <p>Add an account in your authenticator app using this setup key (time-based, 6 digits, 30 seconds), then enter its current code.</p>
            <code style={{ overflowWrap: "anywhere" }}>{secret}</code>
          </>}
          {(secret || status.enabled) && <label style={field}>{secret ? "Authenticator code" : "Authenticator or recovery code"}
            <input name="code" autoComplete="one-time-code" maxLength={64} value={code} onChange={(event) => setCode(event.target.value)} style={input} />
          </label>}
          {secret && <button disabled={busy || !code.trim()} onClick={() => act("PUT")} style={btn("solid")}>Confirm and enable</button>}
          {status.enabled && <button disabled={busy || !code.trim() || !status.configured} onClick={() => act("DELETE")} style={btn("danger")}>Disable authenticator and sign out</button>}
        </>}
      </>}
    </div>
  </section>;
}
