"use client";

import { defaultLandingCms } from "@/lib/ccs/landingDefaults";
import { useCallback, useEffect, useState } from "react";
import { adminTheme as tm, btn, panel, panelHeader, tag } from "./adminUi";

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Admin-only CMS for `/` landing + forum side rails (`forumRail`). */
export function AdminLandingPane({ onError }) {
  const [text, setText] = useState("");
  const [counts, setCounts] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const bundle = await jsonFetch("/api/admin/landing");
    setText(JSON.stringify(bundle.cms, null, 2));
    setCounts(bundle.counts || null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load().catch(onError);
  }, [load, onError]);

  async function save() {
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      setMessage("Invalid JSON.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const bundle = await jsonFetch("/api/admin/landing", { method: "PATCH", body: JSON.stringify({ cms: parsed }) });
      setText(JSON.stringify(bundle.cms, null, 2));
      setCounts(bundle.counts || null);
      setMessage("Published. The homepage polls every ~12s.");
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    setText(JSON.stringify(defaultLandingCms(), null, 2));
    setMessage("Defaults loaded into editor — Save to publish.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section style={panel}>
        <header style={panelHeader}>Live counters (computed — not editable here)</header>
        <div style={{ padding: "14px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", color: tm.muted, fontSize: 13 }}>
          {counts ? (
            <>
              <span style={tag()}>Members · {counts.members}</span>
              <span style={tag()}>Threads · {counts.threads}</span>
              <span style={tag("good")}>Active (24h) · {counts.activeToday}</span>
            </>
          ) : (
            <span style={{ color: tm.muted }}>Load to preview…</span>
          )}
          <button type="button" onClick={() => void load().catch(onError)} style={{ ...btn("ghost"), marginLeft: "auto" }}>Reload</button>
        </div>
      </section>

      <section style={panel}>
        <header style={panelHeader}>
          <span>Landing CMS (JSON)</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={resetDefaults} style={btn("ghost")}>Load defaults into editor</button>
            <button type="button" disabled={saving || !loaded} onClick={() => void save()} style={btn("solid")}>{saving ? "Publishing…" : "Publish"}</button>
          </div>
        </header>
        <div style={{ padding: 14 }}>
          <p style={{ margin: "0 0 10px", color: tm.muted, fontSize: 13, lineHeight: 1.55 }}>
            Edits persist in Neon (<code style={code}>ccs_site_settings</code> · key <code style={code}>landing</code>). The public homepage and forum rails read this payload; visitors pick up updates on the next poll. Staff badge labels are managed under <strong>Site settings → Badge registry</strong> (not in this JSON). Use <code style={code}>postTagOptions</code> (string array) for composer tag chips.
          </p>
          {message && <div style={{ marginBottom: 10, color: tm.good, fontSize: 13, fontWeight: 700 }}>{message}</div>}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 420,
              boxSizing: "border-box",
              fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
              fontSize: 12,
              lineHeight: 1.45,
              borderRadius: 12,
              border: `1px solid ${tm.border}`,
              background: "rgba(0,0,0,0.35)",
              color: tm.text,
              padding: 12,
            }}
          />
        </div>
      </section>
    </div>
  );
}

const code = { padding: "1px 5px", borderRadius: 6, border: `1px solid ${tm.border}`, background: "rgba(255,255,255,0.06)", fontFamily: "var(--font-geist-mono, monospace)", fontSize: 11 };
