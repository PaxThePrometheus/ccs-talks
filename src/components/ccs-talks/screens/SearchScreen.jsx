"use client";

import { useMemo, useState } from "react";
import { APP_CONFIG } from "../config/appConfig";
import { useAppState } from "../state/AppState";

export function SearchScreen() {
  const { posts, users, tokens, prefs } = useAppState();
  const isLight = prefs.mode === "light";
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("latest");
  const [tag, setTag] = useState("All");

  const tags = useMemo(() => {
    const s = new Set(["All"]);
    posts.forEach((p) => s.add(p.tag));
    return Array.from(s);
  }, [posts]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    let xs = posts;
    if (tag !== "All") xs = xs.filter((p) => p.tag === tag);
    if (query) {
      xs = xs.filter((p) => {
        const u = users[p.userId];
        return (
          p.content.toLowerCase().includes(query) ||
          (u?.name || "").toLowerCase().includes(query) ||
          (u?.handle || "").toLowerCase().includes(query) ||
          (p.tag || "").toLowerCase().includes(query)
        );
      });
    }
    if (sort === "top") xs = [...xs].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else if (sort === "relevance" && query) {
      const score = (p) => {
        let s = 0;
        if (p.content.toLowerCase().includes(query)) s += 3;
        const u = users[p.userId];
        if ((u?.name || "").toLowerCase().includes(query)) s += 2;
        if ((u?.handle || "").toLowerCase().includes(query)) s += 2;
        if ((p.tag || "").toLowerCase().includes(query)) s += 1;
        return s;
      };
      xs = [...xs].sort((a, b) => score(b) - score(a));
    } else xs = [...xs].sort((a, b) => Number(b.id) - Number(a.id));
    return xs.slice(0, 50);
  }, [q, sort, tag, posts, users]);

  return (
    <div
      className="ccs-scroll"
      style={{
        position: "fixed",
        top: 0,
        left: 280,
        right: 0,
        bottom: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "1.75rem 2rem 2.5rem",
        borderLeft: `1px solid ${tokens.divider}`,
        color: tokens.text,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", fontSize: 18 }}>{APP_CONFIG.routes.search.title}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: tokens.textMuted }}>SEARCH · SORT · FILTER</div>
        </div>

        <div style={{ marginTop: 12, borderRadius: 18, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(14px)", padding: 14, boxShadow: isLight ? "0 12px 24px rgba(60,0,20,0.08)" : "0 18px 60px rgba(0,0,0,0.28)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ opacity: 0.85 }}>🔎</div>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search threads, people, and tags…"
              style={{
                flex: 1,
                minWidth: 200,
                background: "none",
                border: "none",
                outline: "none",
                color: tokens.text,
                fontSize: 14,
              }}
            />
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle(tokens)}>
              <option value="latest">Latest</option>
              <option value="top">Top</option>
              <option value="relevance">Relevance</option>
            </select>
            <select value={tag} onChange={(e) => setTag(e.target.value)} style={selectStyle(tokens)}>
              {tags.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {results.map((p) => {
            const u = users[p.userId];
            return (
              <div key={p.id} style={{ borderRadius: 18, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(14px)", padding: 14 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900, color: tokens.textStrong }}>{u?.name ?? "Unknown"}</div>
                  <div style={{ color: tokens.textMuted, fontSize: 12 }}>@{u?.handle ?? "unknown"}</div>
                  <div style={{ marginLeft: "auto", color: tokens.textMuted, fontSize: 12 }}>{p.tag}</div>
                </div>
                <div style={{ marginTop: 8, color: tokens.text, fontSize: 13, lineHeight: 1.6 }}>
                  {p.content.length > 220 ? p.content.slice(0, 220) + "…" : p.content}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 12, color: tokens.textMuted, fontSize: 12 }}>
                  <span>♥ {p.likes}</span>
                  <span>💬 {p.comments}</span>
                  <span style={{ marginLeft: "auto" }}>{p.time}</span>
                </div>
              </div>
            );
          })}
          {results.length === 0 && (
            <div style={{ marginTop: 16, color: tokens.textMuted, fontSize: 13 }}>No results. Try a different query.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function selectStyle(tokens) {
  return {
    borderRadius: 12,
    border: `1px solid ${tokens.inputBorder}`,
    background: tokens.inputBg,
    color: tokens.text,
    padding: "8px 10px",
    outline: "none",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  };
}
