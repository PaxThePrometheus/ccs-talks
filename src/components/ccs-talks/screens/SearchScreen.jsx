"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_CONFIG } from "../config/appConfig";
import * as api from "../api/ccsApi";
import { showToast } from "../state/toastBus";
import { useAppState } from "../state/AppState";

export function SearchScreen() {
  const { users: appUsers, tokens, prefs, peekForumSearchSeed, clearForumSearchSeed } = useAppState();
  const isLight = prefs.mode === "light";
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("latest");
  const [tag, setTag] = useState("All");
  /** @type {[import("../api/ccsApi"). unknown] | unknown} merged user map */
  const [extraUsers, setExtraUsers] = useState({});
  const [hits, setHits] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const seed = peekForumSearchSeed?.() || {};
    if (!seed.q && !seed.tag) return;
    if (seed.q) setQ(seed.q);
    if (seed.tag) setTag(seed.tag);
    clearForumSearchSeed?.();
  }, [peekForumSearchSeed, clearForumSearchSeed]);

  const tags = useMemo(() => {
    const s = new Set(["All", "General", "Academics", "Tech", "Events", "Career", "Internships"]);
    hits.forEach((p) => p?.tag && s.add(String(p.tag)));
    return Array.from(s);
  }, [hits]);

  const mergedUsers = useMemo(() => ({ ...appUsers, ...extraUsers }), [appUsers, extraUsers]);

  const runFetch = useCallback(
    async (cursor, accumulate) => {
      const trimmed = q.trim();
      const needText = trimmed.length >= 2;
      const tagged = tag !== "All";
      if (!needText && !tagged) {
        setHits([]);
        setNextCursor(null);
        setExtraUsers({});
        return;
      }
      setLoading(true);
      try {
        const data = await api.searchForum({
          q: trimmed,
          tag: tagged ? tag : undefined,
          cursor: cursor || undefined,
          limit: 40,
        });
        const incoming = Array.isArray(data.posts) ? data.posts : [];
        const u = data.users && typeof data.users === "object" ? data.users : {};
        setExtraUsers((prev) => (accumulate ? { ...prev, ...u } : u));
        setHits((prev) => {
          if (!accumulate) return incoming;
          const seen = new Set(prev.map((p) => String(p.id)));
          const add = incoming.filter((p) => p && !seen.has(String(p.id)));
          return [...prev, ...add];
        });
        const nc =
          data.nextCursor != null && data.nextCursor !== undefined && data.nextCursor !== ""
            ? data.nextCursor
            : null;
        setNextCursor(nc);
      } catch (e) {
        showToast(e?.message || "Search failed.", "error");
        if (!accumulate) setHits([]);
        setNextCursor(null);
      } finally {
        setLoading(false);
      }
    },
    [q, tag]
  );

  useEffect(() => {
    const t = window.setTimeout(() => void runFetch(null, false), 320);
    return () => window.clearTimeout(t);
  }, [q, tag, runFetch]);

  const sorted = useMemo(() => {
    const query = q.trim().toLowerCase();
    let xs = [...hits];
    if (sort === "top") xs.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else if (sort === "relevance" && query) {
      const score = (p) => {
        let s = 0;
        if ((p.content || "").toLowerCase().includes(query)) s += 3;
        const u = mergedUsers[p.userId];
        if ((u?.name || "").toLowerCase().includes(query)) s += 2;
        if ((u?.handle || "").toLowerCase().includes(query)) s += 2;
        if ((p.tag || "").toLowerCase().includes(query)) s += 1;
        return s;
      };
      xs.sort((a, b) => score(b) - score(a));
    } else xs.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    return xs;
  }, [hits, sort, q, mergedUsers]);

  const blockedHint = q.trim().length < 2 && tag === "All";

  return (
    <div
      className="ccs-scroll"
      style={{
        position: "fixed",
        top: 0,
        left: "var(--ccs-shell-left)",
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
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {blockedHint ? (
            <div style={{ marginTop: 8, fontSize: 11, color: tokens.textMuted, lineHeight: 1.4 }}>
              Enter at least two letters, or narrow by tag, to search the server index.
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((p) => {
            const u = mergedUsers[p.userId];
            return (
              <div key={p.id} style={{ borderRadius: 18, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(14px)", padding: 14 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900, color: tokens.textStrong }}>{u?.name ?? "Unknown"}</div>
                  <div style={{ color: tokens.textMuted, fontSize: 12 }}>@{u?.handle ?? "unknown"}</div>
                  <div style={{ marginLeft: "auto", color: tokens.textMuted, fontSize: 12 }}>{p.tag}</div>
                </div>
                <div style={{ marginTop: 8, color: tokens.text, fontSize: 13, lineHeight: 1.6 }}>
                  {(p.content || "").length > 220 ? (p.content || "").slice(0, 220) + "…" : p.content || ""}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 12, color: tokens.textMuted, fontSize: 12 }}>
                  <span>♥ {p.likes}</span>
                  <span>💬 {p.comments}</span>
                  <span style={{ marginLeft: "auto" }}>{p.time ?? ""}</span>
                </div>
              </div>
            );
          })}
          {!blockedHint && sorted.length === 0 && !loading && (
            <div style={{ marginTop: 16, color: tokens.textMuted, fontSize: 13 }}>No results yet for this query.</div>
          )}
          {blockedHint ? (
            <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 13 }}>Type a phrase or choose a tag to search.</div>
          ) : null}
          {loading ? <div style={{ color: tokens.textMuted, fontSize: 12 }}>Loading…</div> : null}
          {nextCursor && !blockedHint ? (
            <button
              type="button"
              onClick={() => void runFetch(nextCursor, true)}
              disabled={loading}
              style={{
                alignSelf: "flex-start",
                marginTop: 4,
                borderRadius: 12,
                border: `1px solid ${tokens.border}`,
                background: tokens.surfaceAlt,
                color: tokens.text,
                padding: "10px 14px",
                fontWeight: 800,
                fontSize: 12,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              Load more
            </button>
          ) : null}
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
