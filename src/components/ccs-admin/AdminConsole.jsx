"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CcsMarkdown } from "@/components/ccs-talks/components/CcsMarkdown";
import { BADGE_REGISTRY_MAX, badgeAccentForLabel, badgePillColors, normalizeHexColor } from "@/lib/ccs/badgeColors";
import { AdminLandingPane } from "./AdminLandingPane";
import { applyMarkdownInsert, MarkdownToolbarRow } from "./markdownTools";
import { adminTheme as t, btn, panel, panelHeader, row, tag } from "./adminUi";

const SECTIONS = [
  { key: "overview", icon: "📊", label: "Overview" },
  { key: "landing", icon: "🖼", label: "Landing page" },
  { key: "users", icon: "👥", label: "Users & roles" },
  { key: "posts", icon: "📰", label: "Posts" },
  { key: "announcements", icon: "📣", label: "Announcements" },
  { key: "tickets", icon: "🎫", label: "Tickets" },
  { key: "audit", icon: "🧾", label: "Audit log" },
  { key: "site", icon: "🛠", label: "Site settings" },
];

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Tokens for markdown preview in dark admin chrome. */
const ANNOUNCE_MD_TOKENS = {
  text: t.text,
  textMuted: t.muted,
  textStrong: t.textStrong,
  accent: t.accent,
  border: t.border,
  surfaceAlt: t.surfaceAlt,
};

function staffProfileSnapshot(pr) {
  const p = pr || {};
  return {
    name: String(p.name ?? ""),
    handle: String(p.handle ?? ""),
    bio: String(p.bio ?? ""),
    college: String(p.college ?? ""),
    program: String(p.program ?? ""),
    campus: String(p.campus ?? ""),
    year: String(p.year ?? ""),
    focus: String(p.focus ?? ""),
    org: String(p.org ?? ""),
    signature: String(p.signature ?? ""),
    signatureLink: String(p.signatureLink ?? ""),
    avatarImage: String(p.avatarImage ?? ""),
    bannerImage: String(p.bannerImage ?? ""),
    avatarColor: String(p.avatarColor ?? ""),
    avatarAccent: String(p.avatarAccent ?? ""),
    bannerColor: String(p.bannerColor ?? ""),
    bannerAccent: String(p.bannerAccent ?? ""),
  };
}

export function AdminConsole({ viewer, inviteRequired }) {
  const [section, setSection] = useState("overview");
  const [error, setError] = useState("");

  const handleErr = useCallback((e) => {
    if (e?.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    setError(e?.message || "Something went wrong.");
  }, []);

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    window.location.href = "/admin/login";
  }

  return (
    <div style={shell}>
      <Sidebar viewer={viewer} section={section} setSection={setSection} signOut={signOut} />
      <main style={mainCol}>
        <Topbar viewer={viewer} title={SECTIONS.find((s) => s.key === section)?.label || ""} />
        {error && (
          <div style={errorBanner} role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} style={{ ...btn("ghost"), padding: "4px 8px" }}>Dismiss</button>
          </div>
        )}
        <div style={{ padding: "1.25rem 1.75rem 2.5rem", display: "flex", flexDirection: "column", gap: 14 }}>
          {section === "overview" && <OverviewPane onError={handleErr} />}
          {section === "landing" && <AdminLandingPane onError={handleErr} />}
          {section === "users" && <UsersPane viewer={viewer} onError={handleErr} inviteRequired={inviteRequired} />}
          {section === "posts" && <PostsPane onError={handleErr} />}
          {section === "announcements" && <AnnouncementsPane viewer={viewer} onError={handleErr} />}
          {section === "tickets" && <TicketsPane viewer={viewer} onError={handleErr} />}
          {section === "audit" && <AuditPane onError={handleErr} />}
          {section === "site" && <SitePane viewer={viewer} onError={handleErr} />}
        </div>
      </main>
    </div>
  );
}

/** ---------- shell ---------- */
function Sidebar({ viewer, section, setSection, signOut }) {
  return (
    <aside style={asideCol}>
      <div style={{ padding: "20px 18px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", color: t.muted }}>CCS TALKS</div>
        <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: "-0.4px", color: t.textStrong, marginTop: 2 }}>Admin Console</div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 12px" }}>
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} style={navItem(section === s.key)}>
            <span style={{ width: 18, textAlign: "center" }}>{s.icon}</span> {s.label}
          </button>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <div style={{ padding: 14, borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #ff6080, #9b0028)" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 13, color: t.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{viewer.name}</div>
            <div style={{ fontSize: 11, color: t.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{viewer.email}</div>
          </div>
        </div>
        <span style={tag(viewer.role === "admin" ? "good" : "warn")}>{viewer.role}</span>
        <a href="/" style={{ ...btn("ghost"), textAlign: "center", textDecoration: "none" }}>↗ Open forum</a>
        <button onClick={signOut} style={btn("ghost")}>↩ Sign out</button>
      </div>
    </aside>
  );
}

function Topbar({ title }) {
  return (
    <div style={topbar}>
      <div style={{ fontWeight: 950, color: t.textStrong, letterSpacing: "-0.2px", fontSize: 16 }}>{title}</div>
      <div style={{ fontSize: 12, color: t.muted }}>operations console</div>
    </div>
  );
}

function formatBytes(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  let v = Number(n);
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

function fmtDuration(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Ring buffer snapshots for realtime charts ({ ts, totals, ops }) */
const OVERVIEW_POLL_MS = 14_000;
const OVERVIEW_HISTORY = 72;

/** Short tooltip copy for admins (also as native fallback `title`). */
const STAT_HELP = {
  users: "Registered accounts in ccs_users. Includes students, moderators, and admins.",
  admins: 'Accounts whose role is "admin". They can manage site settings and delete users.',
  moderators: "Accounts that can moderate content, edit profiles, tickets, announcements (per your rules).",
  banned: 'Users flagged with banned=true. They cannot sign in until staff clears the ban.',
  posts: 'Published forum threads stored in ccs_posts (includes pinned and image posts).',
  comments: 'All comments across posts in ccs_comments.',
};

const OPS_HELP = {
  runtime:
    "The Node.js process answering this Admin request. PID and uptime reset on cold starts (common on serverless hosts). Useful to spot frequent recycling.",
  memory:
    "This serverless instance RSS and V8 heap. Spikes usually mean heavy traffic or a memory leak — compare over time.",
  postgres:
    "Database footprint and rough text payload sizes. Relation total excludes indexes in some Postgres versions.",
  sessions:
    "Login sessions rows and moderator-facing ticket/announcement counters. Audit log grows with every audited staff action.",
  rss: "Resident Set Size — total RAM the OS has assigned this process.",
  heap: "JavaScript heap used by Node / V8. Compare to heapTotal for pressure.",
  dbsize: "pg_database_size — total bytes for the connected database.",
  relations: 'Sum of pg_total_relation_size for base tables/materialized views in schema "public".',
  sessionsActive: 'Session rows whose expires_at is still in the future (users remain signed in until cookie expiry).',
  auditRows: 'Total rows in ccs_audit_log — grows with moderator/admin actions logged to audit.',
};

function OpsCard({ title, titleTip, lines, below }) {
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${t.border}`, padding: "10px 12px", background: "rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <OverviewHoverTip tip={titleTip}>
        <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.06em", color: t.muted, cursor: "help", borderBottom: `1px dashed ${t.border}`, width: "fit-content" }}>
          {title}
        </div>
      </OverviewHoverTip>
      {lines.map((ln, i) => (
        <div key={i} style={{ marginTop: 0, color: t.text, fontSize: 13 }}>
          {ln}
        </div>
      ))}
      {below}
    </div>
  );
}

function OverviewHoverTip({ tip, children }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const updateRect = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateRect();
    const onMove = () => updateRect();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, updateRect]);

  if (!tip) return children;

  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const tw = Math.min(300, Math.max(220, vw - 24));
  const cx = rect.left + rect.width / 2 - tw / 2;
  const left = Math.max(10, Math.min(cx, vw - tw - 10));
  const gap = 10;
  const preferAboveTop = rect.top - gap;

  let topPx = preferAboveTop;
  let transform = "translateY(-100%)";
  if (preferAboveTop < 72) {
    topPx = rect.bottom + gap;
    transform = "none";
  }

  const tooltipNode =
    open && typeof document !== "undefined"
      ? createPortal(
          <span
            role="tooltip"
            style={{
              position: "fixed",
              zIndex: 100000,
              left,
              top: topPx,
              transform,
              width: tw,
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.borderStrong}`,
              background: "rgba(14,0,8,0.97)",
              color: t.text,
              fontSize: 12,
              lineHeight: 1.45,
              fontWeight: 500,
              boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
              pointerEvents: "none",
            }}
          >
            {tip}
          </span>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={wrapRef}
        style={{ display: "inline-flex", verticalAlign: "middle" }}
        onMouseEnter={() => {
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
      >
        {children}
      </span>
      {tooltipNode}
    </>
  );
}

function HorizontalBarPairs({ pairs, captionTip }) {
  const maxVal = Math.max(1, ...pairs.map((p) => Number(p.value) || 0));
  return (
    <OverviewHoverTip tip={captionTip}>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.06em", color: t.muted, marginBottom: 6, cursor: "help" }}>Shares (live mix)</div>
        {pairs.map((p) => (
          <div key={p.key} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.muted }}>
              <span>{p.label}</span>
              <span>{typeof p.fmt === "function" ? p.fmt(p.value) : String(p.value)}</span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ width: `${(Number(p.value) / maxVal) * 100}%`, height: "100%", background: p.barColor || `linear-gradient(90deg, ${t.accent}, ${t.good})`, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </OverviewHoverTip>
  );
}

function extractHistorySeries(history, pick) {
  return history.map(pick).filter((v) => typeof v === "number" && Number.isFinite(v));
}

function colorAlpha(cssColor, a) {
  const s = String(cssColor ?? "").trim();
  const hm = /^#?([0-9a-f]{6})$/i.exec(s);
  if (hm) {
    const n = parseInt(hm[1], 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }
  const rm = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
  if (rm) return `rgba(${rm[1]},${rm[2]},${rm[3]},${a})`;
  return `rgba(255,96,128,${a})`;
}

/** Sample-aligned columns (profiler-style) — avoids stretched SVG artefacts. */
function ProfilerSampleStrip({ values, accentColor = t.accent, height = 50, marginTop = 6 }) {
  let arr = Array.isArray(values) ? values.filter((v) => typeof v === "number" && Number.isFinite(v)) : [];
  if (arr.length === 1) arr = [arr[0], arr[0]];
  if (arr.length < 2) {
    return (
      <div
        style={{
          height,
          marginTop,
          borderRadius: 10,
          border: `1px dashed ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: t.muted,
          fontSize: 11,
          letterSpacing: "0.03em",
        }}
      >
        Collecting samples…
      </div>
    );
  }

  const min = Math.min(...arr),
    max = Math.max(...arr);
  const range = Math.max(max - min, 1e-9);
  const hi = accentColor || t.accent;
  const glow = colorAlpha(hi, 0.42);
  const lo = colorAlpha(hi, 0.62);

  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 4,
        height,
        marginTop,
        padding: "8px 6px",
        borderRadius: 10,
        border: `1px solid ${t.border}`,
        background: `linear-gradient(180deg, rgba(62,214,220,0.07), transparent 62%), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 14px), rgba(0,0,0,0.2)`,
        boxSizing: "border-box",
      }}
    >
      {arr.map((v, i) => {
        const n = (v - min) / range;
        const hPct = Math.max(18, Math.min(100, Math.round(Math.max(0, Math.min(1, n)) * 92 + 8)));
        const last = i === arr.length - 1;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              height: `${hPct}%`,
              borderRadius: 4,
              background: `linear-gradient(180deg, ${hi}, ${lo})`,
              opacity: last ? 1 : 0.76,
              boxShadow: last ? `0 0 12px ${glow}` : undefined,
              boxSizing: "border-box",
              border: last ? `1px solid ${colorAlpha(hi, 0.85)}` : "1px solid transparent",
            }}
          />
        );
      })}
    </div>
  );
}

function StatCard({ title, tip, value, accent, tone, spark, accentColor }) {
  const valueColor = accent ? t.accent : tone === "warn" ? t.warn : tone === "muted" ? t.muted : t.textStrong;
  const stroke = accentColor || valueColor;
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${t.border}`, background: t.surface, backdropFilter: "blur(12px)", padding: "12px 14px 10px", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <OverviewHoverTip tip={tip}>
        <div
          style={{
            color: t.muted,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "help",
            borderBottom: `1px dashed ${t.border}`,
            width: "fit-content",
          }}
          title={tip}
        >
          {title}
        </div>
      </OverviewHoverTip>
      <div style={{ color: valueColor, fontSize: 28, fontWeight: 950, marginTop: 4, lineHeight: 1.1 }}>{Number(value).toLocaleString()}</div>
      <ProfilerSampleStrip values={spark} accentColor={stroke} height={46} marginTop={6} />
    </div>
  );
}

/** ---------- overview ---------- */
function OverviewPane({ onError }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [pollError, setPollError] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      const d = await jsonFetch("/api/admin/overview");
      setData(d);
      setLastRefresh(Date.now());
      setPollError(null);

      const snap = {
        ts: Date.now(),
        totals: d.totals,
        ops: d.ops && typeof d.ops === "object" && !d.ops.error ? d.ops : null,
      };

      setHistory((h) => {
        const next = [...h, snap];
        if (next.length > OVERVIEW_HISTORY) return next.slice(-OVERVIEW_HISTORY);
        return next;
      });
    } catch (e) {
      setPollError(e?.message || "Refresh failed.");
      if (e?.status === 401) onError(e);
    }
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await fetchOverview();
    };
    void run();

    const id = window.setInterval(() => {
      void fetchOverview();
    }, OVERVIEW_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [fetchOverview]);

  if (!data) return <Skeleton />;

  const ops = data.ops && typeof data.ops === "object" && !data.ops.error ? data.ops : null;

  const sUsers = extractHistorySeries(history, (s) => s.totals?.users);
  const sAdmins = extractHistorySeries(history, (s) => s.totals?.admins);
  const sMods = extractHistorySeries(history, (s) => s.totals?.moderators);
  const sBanned = extractHistorySeries(history, (s) => s.totals?.banned);
  const sPosts = extractHistorySeries(history, (s) => s.totals?.posts);
  const sComments = extractHistorySeries(history, (s) => s.totals?.comments);
  const sRss = extractHistorySeries(history, (s) => s.ops?.server?.memory?.rss);
  const sHeap = extractHistorySeries(history, (s) => s.ops?.server?.memory?.heapUsed);
  const sDbSz = extractHistorySeries(history, (s) => s.ops?.storage?.databaseSizeBytes);
  const sSessActive = extractHistorySeries(history, (s) => s.ops?.database?.activeSessions);
  const sAudit = extractHistorySeries(history, (s) => s.ops?.database?.auditLogRows);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: `radial-gradient(circle at 30% 30%, ${t.good}, rgba(120,224,160,0.25))`,
              boxShadow: `0 0 10px rgba(123,224,160,0.45)`,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 800, color: t.textStrong }}>Live dashboards</span>
          <OverviewHoverTip tip="Numbers refresh on a timer from this workstation to /api/admin/overview. Charts need a few polls to shape a trend; serverless spikes are normal between cold starts.">
            <span style={{ cursor: "help", borderBottom: `1px dashed ${t.border}`, fontSize: 12, color: t.muted }}>How realtime works?</span>
          </OverviewHoverTip>
        </div>
        <div style={{ fontSize: 11, color: t.muted, textAlign: "right" }}>
          Poll every {(OVERVIEW_POLL_MS / 1000).toFixed(0)}s
          <br />
          Last update: {lastRefresh ? new Date(lastRefresh).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
          {pollError ? <span style={{ color: t.bad, marginLeft: 8 }}>{pollError}</span> : null}
        </div>
      </div>

      <div style={statGrid}>
        <StatCard title="Users" tip={STAT_HELP.users} value={data.totals.users} accentColor={t.accent} spark={sUsers} />
        <StatCard title="Admins" tip={STAT_HELP.admins} value={data.totals.admins} accent accentColor={t.good} spark={sAdmins} />
        <StatCard title="Moderators" tip={STAT_HELP.moderators} value={data.totals.moderators} accentColor="#ffb05a" spark={sMods} />
        <StatCard
          title="Banned"
          tip={STAT_HELP.banned}
          value={data.totals.banned}
          tone={data.totals.banned > 0 ? "warn" : "muted"}
          accentColor={t.bad}
          spark={sBanned}
        />
        <StatCard title="Posts" tip={STAT_HELP.posts} value={data.totals.posts} accentColor="#ff6090" spark={sPosts} />
        <StatCard title="Comments" tip={STAT_HELP.comments} value={data.totals.comments} accentColor="#b87aff" spark={sComments} />
      </div>

      {history.length >= 2 ? (
        <section style={{ ...panel, marginTop: 10 }}>
          <header style={panelHeader}>
            <OverviewHoverTip tip="Column strips use the same poll snapshots as the grid above. Hover card titles elsewhere for glossary text; useful to correlate activity with memory drift.">
              <span style={{ cursor: "help", borderBottom: `1px dashed ${t.border}` }}>Realtime trends</span>
            </OverviewHoverTip>
          </header>
          <div style={{ padding: "12px 16px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <div>
              <OverviewHoverTip tip="Community totals from the overview payload: users, posts, comments over time — watch for bursts after campaigns or scraping.">
                <div style={{ fontSize: 11, fontWeight: 900, color: t.muted, marginBottom: 4, cursor: "help", width: "fit-content", borderBottom: `1px dashed ${t.border}` }}>Forum volume</div>
              </OverviewHoverTip>
              <ProfilerSampleStrip values={sUsers} accentColor={t.accent} height={48} marginTop={4} />
              <div style={{ fontSize: 10, color: t.muted }}>Users</div>
              <ProfilerSampleStrip values={sPosts} accentColor="#ff6090" height={48} marginTop={4} />
              <div style={{ fontSize: 10, color: t.muted }}>Posts</div>
              <ProfilerSampleStrip values={sComments} accentColor="#b87aff" height={48} marginTop={4} />
              <div style={{ fontSize: 10, color: t.muted }}>Comments</div>
            </div>
            <div>
              <OverviewHoverTip tip={OPS_HELP.memory}>
                <div style={{ fontSize: 11, fontWeight: 900, color: t.muted, marginBottom: 4, cursor: "help", width: "fit-content", borderBottom: `1px dashed ${t.border}` }}>Memory</div>
              </OverviewHoverTip>
              <ProfilerSampleStrip values={sRss} accentColor={t.good} height={48} marginTop={4} />
              <div style={{ fontSize: 10, color: t.muted }} title={OPS_HELP.rss}>{OPS_HELP.rss}</div>
              <ProfilerSampleStrip values={sHeap} accentColor={t.warn} height={48} marginTop={4} />
              <div style={{ fontSize: 10, color: t.muted }} title={OPS_HELP.heap}>{OPS_HELP.heap}</div>
            </div>
            <div>
              <OverviewHoverTip tip="Database + operational counts: storage changes slowly unless bulk imports or vacuum; sessions jump with logins; audit climbs with moderator actions.">
                <div style={{ fontSize: 11, fontWeight: 900, color: t.muted, marginBottom: 4, cursor: "help", width: "fit-content", borderBottom: `1px dashed ${t.border}` }}>Platform</div>
              </OverviewHoverTip>
              <ProfilerSampleStrip values={sDbSz} accentColor="#6ec8ff" height={48} marginTop={4} />
              <div style={{ fontSize: 10, color: t.muted }} title={OPS_HELP.dbsize}>{OPS_HELP.dbsize}</div>
              <ProfilerSampleStrip values={sSessActive} accentColor="#ffa6c9" height={48} marginTop={4} />
              <div style={{ fontSize: 10, color: t.muted }} title={OPS_HELP.sessionsActive}>{OPS_HELP.sessionsActive}</div>
              <ProfilerSampleStrip values={sAudit} accentColor="#c4b088" height={48} marginTop={4} />
              <div style={{ fontSize: 10, color: t.muted }} title={OPS_HELP.auditRows}>{OPS_HELP.auditRows}</div>
            </div>
          </div>
        </section>
      ) : null}

      {ops ? (
        <section style={panel}>
          <header style={{ ...panelHeader, gap: 10 }}>
            <span>
              Server &amp; storage
              <OverviewHoverTip tip="Each poll runs SQL size queries and aggregates. Values can differ slightly between Neon compute instances; spikes during deploys are expected.">
                <span style={{ marginLeft: 8, opacity: 0.75, cursor: "help", fontSize: 11, fontWeight: 800 }}>(?)</span>
              </OverviewHoverTip>
            </span>
          </header>
          <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: t.text }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <OpsCard
                title="Runtime"
                titleTip={OPS_HELP.runtime}
                lines={[`Node ${ops.server.node}`, `${ops.server.platform} · pid ${ops.server.pid}`, `Uptime ${fmtDuration(ops.server.uptimeSeconds)}`, `TZ ${ops.server.timeZone || "—"}`]}
                below={
                  <ProfilerSampleStrip values={extractHistorySeries(history, (s) => s.ops?.server?.uptimeSeconds)} accentColor="#8899aa" height={44} marginTop={4} />
                }
              />
              <OpsCard
                title="Memory (process)"
                titleTip={OPS_HELP.memory}
                lines={[
                  `RSS ${formatBytes(ops.server.memory.rss)}`,
                  `Heap used ${formatBytes(ops.server.memory.heapUsed)} / ${formatBytes(ops.server.memory.heapTotal)}`,
                  `External ${formatBytes(ops.server.memory.external)}`,
                ]}
                below={
                  <>
                    <ProfilerSampleStrip values={sRss} accentColor={t.good} height={42} marginTop={4} />
                    <ProfilerSampleStrip values={sHeap} accentColor={t.warn} height={42} marginTop={4} />
                  </>
                }
              />
              <OpsCard
                title="Postgres"
                titleTip={OPS_HELP.postgres}
                lines={[
                  `DB size ${formatBytes(ops.storage.databaseSizeBytes)}`,
                  `Tables (relation total) ${formatBytes(ops.storage.relationStorageBytes)}`,
                  `Posts text ≈ ${formatBytes(ops.storage.postsTextBytes)}`,
                  `Comments text ≈ ${formatBytes(ops.storage.commentsTextBytes)}`,
                ]}
                below={
                  <>
                    <ProfilerSampleStrip values={extractHistorySeries(history, (s) => s.ops?.storage?.relationStorageBytes)} accentColor="#6ec8ff" height={42} marginTop={4} />
                    <div style={{ fontSize: 10, color: t.muted }} title={OPS_HELP.relations}>{OPS_HELP.relations}</div>
                  </>
                }
              />
              <OpsCard
                title="Rows & sessions"
                titleTip={OPS_HELP.sessions}
                lines={[
                  `Sessions (all) ${ops.database.sessionsTotal}`,
                  `Sessions (unexpired) ${ops.database.activeSessions}`,
                  `Announcements ${ops.database.announcements}`,
                  `Tickets ${ops.database.tickets} (${ops.database.ticketsOpen} open)`,
                  `Audit log rows ${ops.database.auditLogRows}`,
                ]}
                below={
                  <>
                    <HorizontalBarPairs
                      captionTip="Relative scales of this snapshot only (normalized to the largest bar). Columns in the strips above stay aligned poll-to-poll."
                      pairs={[
                        { key: "sess", label: "Active sessions", value: ops.database.activeSessions, barColor: `linear-gradient(90deg, ${t.accent}, #ff9070)`, fmt: String },
                        {
                          key: "post",
                          label: "Announcements · tickets(open)",
                          value: ops.database.announcements + ops.database.ticketsOpen,
                          barColor: `linear-gradient(90deg, #6ec8ff, ${t.good})`,
                          fmt: (v) =>
                            `${ops.database.announcements} · ${ops.database.ticketsOpen} (sum ${typeof v === "number" ? v : "-"})`,
                        },
                        { key: "audit", label: "Audit rows", value: ops.database.auditLogRows, barColor: "#c4b088", fmt: String },
                      ]}
                    />
                    <ProfilerSampleStrip values={sSessActive} accentColor="#ffa6c9" height={40} marginTop={6} />
                  </>
                }
              />
            </div>
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
              <OverviewHoverTip tip="Deployment flags surfaced from env for quick checks — not realtime metrics themselves.">
                <div style={{ fontWeight: 900, color: t.textStrong, marginBottom: 6, cursor: "help", width: "fit-content", borderBottom: `1px dashed ${t.border}` }}>Integrations &amp; API</div>
              </OverviewHoverTip>
              <div style={{ color: t.muted, fontSize: 12, lineHeight: 1.55 }}>
                <div>
                  DB host: <code style={code}>{ops.database.hostMasked}</code>
                </div>
                <div>
                  Transactional email (Resend):{" "}
                  <span style={tag(ops.integrations.transactionalEmail ? "good" : "warn")}>{ops.integrations.transactionalEmail ? "configured" : "not set"}</span>{" "}
                  <code style={code}>RESEND_API_KEY</code>
                </div>
                <div>
                  Public app URL for links:{" "}
                  <span style={tag(ops.integrations.publicAppUrl ? "good" : "warn")}>{ops.integrations.publicAppUrl ? "ok" : "missing"}</span>{" "}
                  <code style={code}>CCS_PUBLIC_URL</code> / <code style={code}>NEXT_PUBLIC_APP_URL</code> / Vercel
                </div>
                <div>
                  Auth pepper: <span style={tag(ops.integrations.authPepperSet ? "good" : "warn")}>{ops.integrations.authPepperSet ? "set" : "optional"}</span>{" "}
                  <code style={code}>CCS_AUTH_PEPPER</code>
                </div>
                <div>
                  Admin invite env: <span style={tag(ops.integrations.adminInviteEnv ? "good" : "neutral")}>{ops.integrations.adminInviteEnv ? "set" : "empty"}</span>{" "}
                  <code style={code}>CCS_ADMIN_INVITE</code>
                </div>
                <div style={{ marginTop: 8 }}>{ops.api.note}</div>
              </div>
            </div>
          </div>
        </section>
      ) : data.ops?.error ? (
        <section style={panel}>
          <header style={panelHeader}>Server &amp; storage</header>
          <div style={{ padding: 16, color: t.warn, fontSize: 13 }}>{data.ops.error}</div>
        </section>
      ) : null}

      <section style={panel}>
        <header style={panelHeader}>Recent admin activity</header>
        {data.recentAudit.length === 0 && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>No actions logged yet.</div>}
        {data.recentAudit.map((a) => (
          <div key={a.id} style={row}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={tag()}>{a.action}</span>
                <span style={{ color: t.muted, fontSize: 12 }}>{new Date(a.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ color: t.text, fontSize: 12 }}>actor <code style={code}>{a.actorId}</code> {a.targetId && <>→ <code style={code}>{a.targetId}</code></>}</div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

/** ---------- users ---------- */
function BadgesEditor({ userId, badges, catalog, badgeColors, onSave }) {
  const [draft, setDraft] = useState("");
  const list = Array.isArray(badges) ? badges : [];
  const bpTok = { text: t.text, border: t.border, surfaceAlt: t.surfaceAlt };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, maxWidth: 420 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {list.map((b) => {
          const acc = badgeAccentForLabel(badgeColors || {}, b);
          const pill = badgePillColors(acc, false, bpTok);
          return (
            <button
              key={b}
              type="button"
              onClick={() => onSave(list.filter((x) => x !== b))}
              style={{
                cursor: "pointer",
                border: `1px solid ${pill.border}`,
                background: pill.background,
                color: pill.color,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 999,
              }}
              title="Remove"
            >
              {b} ×
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <input list={`badge-cat-${userId}`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add badge…" style={{ ...inp(160), fontSize: 12 }} />
        <datalist id={`badge-cat-${userId}`}>
          {(catalog || []).map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => {
            const v = draft.trim().slice(0, 40);
            if (!v) return;
            if (list.includes(v) || list.length >= 8) {
              setDraft("");
              return;
            }
            onSave([...list, v]);
            setDraft("");
          }}
          style={{ ...btn("ghost"), padding: "6px 10px", fontSize: 12 }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function StaffForumProfileFold({ user, patchUser }) {
  const [form, setForm] = useState(() => staffProfileSnapshot(user.profile));

  useEffect(() => {
    setForm(staffProfileSnapshot(user.profile));
  }, [user.id]); // Avoid resetting drafts when list rows re-render with new profile object refs.

  const setField = useCallback((k) => (e) => {
    const v = e.target?.value ?? "";
    setForm((s) => ({ ...s, [k]: typeof v === "string" ? v : String(v) }));
  }, []);

  async function saveProfile() {
    const next = await patchUser(user.id, { profile: form });
    if (next?.profile) setForm(staffProfileSnapshot(next.profile));
  }

  const fld = (
    <>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>NAME</div>
        <input value={form.name} onChange={setField("name")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>HANDLE</div>
        <input value={form.handle} onChange={setField("handle")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BIO</div>
        <textarea value={form.bio} onChange={setField("bio")} rows={3} style={{ ...inp(520), height: 72, resize: "vertical", fontFamily: "inherit", fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>COLLEGE</div>
        <input value={form.college} onChange={setField("college")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>PROGRAM</div>
        <input value={form.program} onChange={setField("program")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>CAMPUS</div>
        <input value={form.campus} onChange={setField("campus")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>YEAR</div>
        <input value={form.year} onChange={setField("year")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>FOCUS</div>
        <input value={form.focus} onChange={setField("focus")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>ORG</div>
        <input value={form.org} onChange={setField("org")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>SIGNATURE</div>
        <textarea value={form.signature} onChange={setField("signature")} rows={2} style={{ ...inp(520), height: 52, resize: "vertical", fontFamily: "inherit", fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>SIGNATURE LINK (https…)</div>
        <input value={form.signatureLink} onChange={setField("signatureLink")} style={{ ...inp(520), fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>AVATAR IMAGE URL</div>
        <input value={form.avatarImage} onChange={setField("avatarImage")} style={{ ...inp(520), fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BANNER IMAGE URL</div>
        <input value={form.bannerImage} onChange={setField("bannerImage")} style={{ ...inp(520), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>AVATAR ACCENT</div>
        <input value={form.avatarAccent} onChange={setField("avatarAccent")} placeholder="#ff6080" style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>AVATAR COLOR</div>
        <input value={form.avatarColor} onChange={setField("avatarColor")} placeholder="#9b0028" style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BANNER ACCENT</div>
        <input value={form.bannerAccent} onChange={setField("bannerAccent")} placeholder="#ff3a6e" style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BANNER COLOR</div>
        <input value={form.bannerColor} onChange={setField("bannerColor")} placeholder="#3a0014" style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
        <button type="button" onClick={() => void saveProfile()} style={btn("solid")}>
          Save profile
        </button>
      </div>
    </>
  );

  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 900, color: t.textStrong, userSelect: "none" }}>Forum profile (staff)</summary>
      <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", maxWidth: 720 }}>{fld}</div>
    </details>
  );
}

function UsersPane({ viewer, onError, inviteRequired }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [badgeCatalog, setBadgeCatalog] = useState([]);
  const [siteBadgeColors, setSiteBadgeColors] = useState({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (roleFilter) params.set("role", roleFilter);
      const data = await jsonFetch(`/api/admin/users?${params.toString()}`);
      setUsers(data.users || []);
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, onError]);

  useEffect(() => {
    const t = setTimeout(reload, 200);
    return () => clearTimeout(t);
  }, [reload]);

  useEffect(() => {
    let alive = true;
    void jsonFetch("/api/admin/landing")
      .then((d) => {
        if (!alive) return;
        setBadgeCatalog(Array.isArray(d?.cms?.badgeCatalog) ? d.cms.badgeCatalog : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void jsonFetch("/api/admin/site")
      .then((d) => {
        if (!alive) return;
        const bc = d?.settings?.badgeColors;
        setSiteBadgeColors(bc && typeof bc === "object" ? bc : {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function patchUser(id, patch) {
    try {
      const data = await jsonFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
      if (data?.user) {
        setUsers((xs) => xs.map((u) => (u.id === id ? data.user : u)));
        return data.user;
      }
    } catch (e) {
      onError(e);
    }
    return null;
  }

  async function removeUser(id) {
    if (!window.confirm("Permanently delete this account, their posts, and their comments? This cannot be undone.")) return;
    try {
      await jsonFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      setUsers((xs) => xs.filter((u) => u.id !== id));
    } catch (e) {
      onError(e);
    }
  }

  return (
    <>
      <section style={panel}>
        <header style={{ ...panelHeader, gap: 12, flexWrap: "wrap" }}>
          <span>Users · {users.length}</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id or email…" style={{ ...inp(220) }} />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ ...inp(140) }}>
              <option value="">All roles</option>
              <option value="admin">admin</option>
              <option value="moderator">moderator</option>
              <option value="student">student</option>
            </select>
          </div>
        </header>
        {loading && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>Loading…</div>}
        {!loading && users.length === 0 && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>No users match this filter.</div>}
        {!loading && users.map((u) => (
          <div key={u.id} style={row}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: u.profile?.avatarImage ? `url(${u.profile.avatarImage}) center/cover no-repeat` : `linear-gradient(135deg, ${u.profile?.avatarAccent || "#ff6080"}, ${u.profile?.avatarColor || "#9b0028"})`, border: `1px solid ${t.border}` }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 900, color: t.textStrong, fontSize: 14 }}>{u.profile?.name || u.email}</span>
                  <span style={tag(u.role === "admin" ? "good" : u.role === "moderator" ? "warn" : "neutral")}>{u.role}</span>
                  {u.banned && <span style={tag("bad")}>banned</span>}
                  {u.id === viewer.id && <span style={tag("good")}>you</span>}
                </div>
                <div style={{ fontSize: 12, color: t.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  @{u.profile?.handle || "—"} · {u.email} · <code style={code}>{u.id}</code>
                </div>
                {u.banned && u.bannedReason && <div style={{ fontSize: 12, color: t.bad, marginTop: 2 }}>“{u.bannedReason}”</div>}
                {(viewer.role === "admin" || viewer.role === "moderator") ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>STATUS</div>
                    <input
                      title="Visible on profile — students cannot edit this themselves."
                      defaultValue={u.profile?.status || ""}
                      onBlur={(e) => patchUser(u.id, { status: e.target.value.trim() })}
                      placeholder="e.g. Student · Dean’s Lister"
                      style={{ ...inp(260), fontSize: 12 }}
                    />
                  </div>
                ) : null}

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BADGES</div>
                  <BadgesEditor
                    userId={u.id}
                    badges={u.profile?.badges}
                    catalog={badgeCatalog}
                    badgeColors={siteBadgeColors}
                    onSave={(next) => void patchUser(u.id, { badges: next })}
                  />
                </div>
                {(viewer.role === "admin" || viewer.role === "moderator") ? <StaffForumProfileFold user={u} patchUser={patchUser} /> : null}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {viewer.role === "admin" && (
                <select value={u.role} onChange={(e) => patchUser(u.id, { role: e.target.value })} disabled={u.id === viewer.id && u.role === "admin"} style={{ ...inp(140) }}>
                  <option value="student">student</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
              )}
              {!u.banned && u.id !== viewer.id && (
                <button onClick={() => {
                  const reason = window.prompt("Reason for banning this user?", "Violation of community guidelines.");
                  if (reason == null) return;
                  patchUser(u.id, { banned: true, bannedReason: reason });
                }} style={btn("danger")}>Ban</button>
              )}
              {u.banned && (
                <button onClick={() => patchUser(u.id, { banned: false })} style={btn("solid")}>Unban</button>
              )}
              {viewer.role === "admin" && u.id !== viewer.id && (
                <button onClick={() => removeUser(u.id)} style={btn("danger")}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section style={panel}>
        <header style={panelHeader}>Onboard another administrator</header>
        <div style={{ padding: 16, fontSize: 13, color: t.text, lineHeight: 1.6 }}>
          {inviteRequired ? (
            <>
              <p style={{ margin: 0 }}>Two ways to add another admin:</p>
              <ul style={{ paddingLeft: 18, margin: "8px 0 0", color: t.muted }}>
                <li>Promote any existing user above by changing their role to <strong style={{ color: t.text }}>admin</strong>.</li>
                <li>Or share <a href="/admin/register" style={{ color: t.accent, fontWeight: 800 }}>/admin/register</a> with the invite code stored in the <code style={code}>CCS_ADMIN_INVITE</code> environment variable.</li>
              </ul>
            </>
          ) : (
            <p style={{ margin: 0, color: t.muted }}>Self-registration via <code style={code}>CCS_ADMIN_INVITE</code> is currently disabled. You can still promote any existing user to admin from the table above.</p>
          )}
        </div>
      </section>
    </>
  );
}

/** ---------- posts ---------- */
function PostsPane({ onError }) {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [draftBody, setDraftBody] = useState("");
  const [postPreview, setPostPreview] = useState(false);
  const editTaRef = useRef(null);
  const mdTokToolbar = useMemo(() => ({ accent: t.accent, border: t.border, text: t.text, muted: t.muted, surfaceAlt: t.surfaceAlt }), []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const data = await jsonFetch(`/api/admin/posts?${params.toString()}`);
      setPosts(data.posts || []);
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }, [q, onError]);

  useEffect(() => {
    const t = setTimeout(reload, 200);
    return () => clearTimeout(t);
  }, [reload]);

  function openPostEditor(p) {
    setEditor(p);
    setDraftBody(typeof p.content === "string" ? p.content : "");
    setPostPreview(false);
  }

  function closePostEditor() {
    setEditor(null);
    setDraftBody("");
  }

  function applyPostMd(op) {
    const ta = editTaRef.current;
    if (!ta) return;
    const { next, focusStart, focusEnd } = applyMarkdownInsert(draftBody, ta.selectionStart, ta.selectionEnd, op);
    setDraftBody(next);
    requestAnimationFrame(() => {
      ta.selectionStart = focusStart;
      ta.selectionEnd = focusEnd;
      ta.focus();
    });
  }

  async function pin(id, pinned) {
    try {
      await jsonFetch(`/api/admin/posts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ pinned }) });
      setPosts((xs) => xs.map((p) => (p.id === id ? { ...p, pinned } : p)));
    } catch (e) {
      onError(e);
    }
  }

  async function savePostBody() {
    if (!editor) return;
    try {
      await jsonFetch(`/api/admin/posts/${encodeURIComponent(editor.id)}`, { method: "PATCH", body: JSON.stringify({ content: draftBody }) });
      setPosts((xs) => xs.map((x) => (x.id === editor.id ? { ...x, content: draftBody } : x)));
      closePostEditor();
    } catch (e) {
      onError(e);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this post and all its comments?")) return;
    try {
      await jsonFetch(`/api/admin/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
      setPosts((xs) => xs.filter((p) => p.id !== id));
      if (editor?.id === id) closePostEditor();
    } catch (e) {
      onError(e);
    }
  }

  return (
    <>
      <section style={panel}>
        <header style={{ ...panelHeader, gap: 12, flexWrap: "wrap" }}>
          <span>Posts · {posts.length}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search post body…" style={{ ...inp(260) }} />
        </header>
        {loading && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>Loading…</div>}
        {!loading && posts.length === 0 && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>No posts match.</div>}
        {!loading && posts.map((p) => (
          <div key={p.id} style={row}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={tag()}>{p.tag}</span>
                {p.pinned && <span style={tag("good")}>📌 pinned</span>}
                <span style={{ color: t.muted, fontSize: 12 }}>by <code style={code}>{p.userId}</code></span>
                <span style={{ color: t.muted, fontSize: 12 }}>· {new Date(p.createdAt).toLocaleString()}</span>
                <span style={{ color: t.muted, fontSize: 12 }}>· {p.likedBy.length} likes · {p.commentCount} comments</span>
              </div>
              <div style={{ color: t.text, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.content}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" onClick={() => pin(p.id, !p.pinned)} style={btn("ghost")}>{p.pinned ? "Unpin" : "Pin"}</button>
              <button type="button" onClick={() => openPostEditor(p)} style={btn("ghost")}>Edit body</button>
              <button type="button" onClick={() => remove(p.id)} style={btn("danger")}>Delete</button>
            </div>
          </div>
        ))}
      </section>

      {editor ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.58)", backdropFilter: "blur(6px)", zIndex: 200, overflow: "auto", padding: 20 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePostEditor();
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ccs-admin-post-edit-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 720,
              margin: "32px auto",
              borderRadius: 16,
              border: `1px solid ${t.border}`,
              background: "rgba(18,0,10,0.96)",
              boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
              padding: "1.25rem 1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div id="ccs-admin-post-edit-title" style={{ fontWeight: 950, fontSize: 17, color: t.textStrong }}>Edit post (markdown)</div>
                <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
                  <code style={code}>{editor.id}</code> · tag {editor.tag}
                </div>
              </div>
              <button type="button" onClick={() => closePostEditor()} style={btn("ghost")}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <MarkdownToolbarRow tokens={mdTokToolbar} onOp={applyPostMd} />
              <textarea
                ref={editTaRef}
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={14}
                style={{
                  ...inp(620),
                  width: "100%",
                  marginTop: 10,
                  minHeight: 220,
                  resize: "vertical",
                  fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
                  fontSize: 13,
                }}
              />
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: t.muted, marginTop: 8 }}>
              <input type="checkbox" checked={postPreview} onChange={(e) => setPostPreview(e.target.checked)} />
              Live markdown preview (forum-rendered GFM + https images only)
            </label>
            {postPreview ? (
              <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: "rgba(0,0,0,0.28)", fontSize: 13 }}>
                <CcsMarkdown source={draftBody || "(empty)"} accentColor={t.accent} tokens={ANNOUNCE_MD_TOKENS} />
              </div>
            ) : null}

            <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" onClick={() => closePostEditor()} style={btn("ghost")}>
                Cancel
              </button>
              <button type="button" onClick={() => void savePostBody()} style={btn("solid")}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** ---------- audit ---------- */
function AuditPane({ onError }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    jsonFetch("/api/admin/audit?limit=200")
      .then((d) => !cancel && setEntries(d.entries || []))
      .catch(onError)
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [onError]);

  return (
    <section style={panel}>
      <header style={panelHeader}>Audit log · {entries.length}</header>
      {loading && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>Loading…</div>}
      {!loading && entries.length === 0 && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>No actions logged yet.</div>}
      {!loading && entries.map((a) => (
        <div key={a.id} style={row}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={tag()}>{a.action}</span>
              <span style={{ color: t.muted, fontSize: 12 }}>{new Date(a.createdAt).toLocaleString()}</span>
            </div>
            <div style={{ color: t.text, fontSize: 12 }}>
              actor <code style={code}>{a.actorId}</code>
              {a.targetId && <> → <code style={code}>{a.targetId}</code></>}
            </div>
            {a.meta && Object.keys(a.meta).length > 0 && (
              <pre style={{ margin: 0, padding: "6px 8px", borderRadius: 8, background: "rgba(0,0,0,0.30)", color: t.muted, fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(a.meta, null, 0)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

/** ---------- announcements ---------- */
function AnnouncementsPane({ viewer, onError }) {
  const [rows, setRows] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [mdPreview, setMdPreview] = useState(false);
  const mdTaRef = useRef(null);

  const mdTokToolbar = useMemo(() => ({ accent: t.accent, border: t.border, text: t.text, muted: t.muted, surfaceAlt: t.surfaceAlt }), []);

  const reload = useCallback(async () => {
    try {
      const data = await jsonFetch("/api/admin/announcements");
      setRows(Array.isArray(data?.announcements) ? data.announcements : []);
    } catch (e) {
      onError(e);
    }
  }, [onError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isAdmin = viewer.role === "admin";

  async function create() {
    try {
      await jsonFetch("/api/admin/announcements", { method: "POST", body: JSON.stringify({ title, body, pinned }) });
      setTitle("");
      setBody("");
      setPinned(false);
      await reload();
    } catch (e) {
      onError(e);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await jsonFetch(`/api/admin/announcements/${encodeURIComponent(id)}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      onError(e);
    }
  }

  function applyAnnouncementMd(op) {
    const ta = mdTaRef.current;
    if (!ta) return;
    const { next, focusStart, focusEnd } = applyMarkdownInsert(body, ta.selectionStart, ta.selectionEnd, op);
    setBody(next);
    requestAnimationFrame(() => {
      ta.selectionStart = focusStart;
      ta.selectionEnd = focusEnd;
      ta.focus();
    });
  }

  return (
    <>
      {isAdmin ? (
        <section style={panel}>
          <header style={panelHeader}>Post announcement</header>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={inp(520)} />
            <MarkdownToolbarRow tokens={mdTokToolbar} dense onOp={applyAnnouncementMd} />
            <textarea
              ref={mdTaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Markdown body…"
              rows={7}
              style={{ ...inp(520), minHeight: 160, resize: "vertical", fontFamily: "var(--font-geist-mono, ui-monospace, monospace)", fontSize: 13 }}
            />
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: t.muted }}>
              <input type="checkbox" checked={mdPreview} onChange={(e) => setMdPreview(e.target.checked)} />
              Live markdown preview
            </label>
            {mdPreview ? (
              <div style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.border}`, background: "rgba(0,0,0,0.25)", fontSize: 13 }}>
                <CcsMarkdown source={body || "(empty)"} accentColor={t.accent} tokens={ANNOUNCE_MD_TOKENS} />
              </div>
            ) : null}
            <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5 }}>
              Use the toolbar above or write GitHub-flavoured Markdown: **bold**, lists, <code style={code}>```fenced code```</code>, tables, links. Images must use{" "}
              <code style={code}>https://...</code>. Mentions: <code style={code}>@handle</code>.
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: t.text }}>
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin to top
            </label>
            <button type="button" disabled={!title.trim()} onClick={() => void create()} style={btn("solid")}>
              Publish
            </button>
          </div>
        </section>
      ) : (
        <section style={panel}>
          <header style={panelHeader}>Announcements</header>
          <div style={{ padding: 16, fontSize: 13, color: t.muted }}>Only administrators can create or delete announcements. You can review the list below.</div>
        </section>
      )}

      <section style={panel}>
        <header style={panelHeader}>Public feed · {rows.length}</header>
        {rows.length === 0 && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>No announcements.</div>}
        {rows.map((a) => (
          <div key={a.id} style={row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, color: t.textStrong }}>{a.pinned ? "📌 " : ""}{a.title}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: t.text }}>
                <CcsMarkdown source={a.body || ""} accentColor={t.accent} tokens={ANNOUNCE_MD_TOKENS} />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: t.muted }}>{new Date(a.createdAt).toLocaleString()}</div>
            </div>
            {isAdmin ? (
              <button type="button" onClick={() => void remove(a.id)} style={btn("danger")}>
                Delete
              </button>
            ) : null}
          </div>
        ))}
      </section>
    </>
  );
}

/** ---------- tickets ---------- */
function TicketsPane({ onError }) {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  const reload = useCallback(async () => {
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const data = await jsonFetch(`/api/admin/tickets${qs}`);
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
    } catch (e) {
      onError(e);
    }
  }, [onError, statusFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <section style={panel}>
      <header style={{ ...panelHeader, gap: 12, flexWrap: "wrap" }}>
        <span>Tickets · {tickets.length}</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inp(140)}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </header>
      {tickets.length === 0 && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>No tickets.</div>}
      {tickets.map((tk) => (
        <TicketStaffRow key={tk.id} tk={tk} onError={onError} onSaved={reload} />
      ))}
    </section>
  );
}

function TicketStaffRow({ tk, onError, onSaved }) {
  const [reply, setReply] = useState(tk.staffReply || "");
  const [status, setStatus] = useState(tk.status || "open");

  useEffect(() => {
    setReply(tk.staffReply || "");
    setStatus(tk.status || "open");
  }, [tk.id, tk.staffReply, tk.status]);

  async function save() {
    try {
      await jsonFetch(`/api/admin/tickets/${encodeURIComponent(tk.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status, staffReply: reply }),
      });
      await onSaved();
    } catch (e) {
      onError(e);
    }
  }

  return (
    <div style={{ ...row, alignItems: "start" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 900, color: t.textStrong }}>{tk.subject}</div>
        <code style={code}>{tk.userId}</code>
        <div style={{ fontSize: 13, color: t.muted, whiteSpace: "pre-wrap" }}>{tk.body}</div>
        <div style={{ fontSize: 11, color: t.muted }}>Updated {new Date(tk.updatedAt).toLocaleString()}</div>

        <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Staff reply (visible to user)" rows={3} style={{ ...inp(560), height: 72, resize: "vertical", fontFamily: "inherit" }} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={inp(120)}>
            <option value="open">open</option>
            <option value="closed">closed</option>
          </select>
          <button type="button" onClick={() => void save()} style={btn("solid")}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const PROFILE_OPTION_FIELDS = Object.freeze([
  ["programs", "Programs / courses"],
  ["campuses", "Campuses"],
  ["years", "Years"],
  ["focuses", "Focus areas"],
  ["orgs", "Organizations"],
]);

function newBadgeRegistryRowId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `br_${crypto.randomUUID()}`;
  return `br_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function BadgeRegistryEditor({ registry, disabled, onSave }) {
  const incoming = Array.isArray(registry) ? registry : [];
  const [draft, setDraft] = useState(() => incoming.map((r) => ({ id: r.id, label: r.label ?? "", color: r.color ?? "#FF6080" })));

  function commit(rows) {
    if (disabled) return;
    const payload = rows
      .map((r) => ({
        id: String(r?.id || "").trim() || newBadgeRegistryRowId(),
        label: String(r?.label ?? "").trim(),
        color: String(r?.color ?? "").trim(),
      }))
      .filter((r) => r.label.length > 0);
    void onSave(payload);
  }

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
      {draft.map((row, idx) => (
        <div
          key={row.id || `idx_${idx}`}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            disabled={disabled}
            value={row.label}
            placeholder="Badge label shown on profiles"
            onChange={(e) => {
              const v = e.target.value;
              setDraft((d) => d.map((r, i) => (i === idx ? { ...r, label: v } : r)));
            }}
            onBlur={() => commit(draft)}
            style={{ ...inp(undefined), boxSizing: "border-box", width: "100%", minWidth: 0 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, opacity: disabled ? 0.55 : 1 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: t.muted, whiteSpace: "nowrap" }}>Colour</span>
            <input
              disabled={disabled}
              type="color"
              aria-label={`Colour for ${row.label || "badge"}`}
              value={normalizeHexColor(row.color) || "#FF6080"}
              onChange={(e) => {
                const hex = normalizeHexColor(e.target.value);
                const nextDraft = draft.map((r, i) => (i === idx ? { ...r, color: hex || r.color } : r));
                setDraft(nextDraft);
                commit(nextDraft);
              }}
              style={{ width: 42, height: 32, padding: 2, border: `1px solid ${t.border}`, borderRadius: 8, background: "rgba(0,0,0,0.35)", cursor: disabled ? "not-allowed" : "pointer" }}
            />
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = draft.filter((_, i) => i !== idx);
              setDraft(next);
              commit(next);
            }}
            style={btn("danger")}
          >
            Remove
          </button>
        </div>
      ))}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          disabled={disabled || draft.length >= BADGE_REGISTRY_MAX}
          onClick={() => {
            const next = [...draft, { id: newBadgeRegistryRowId(), label: "", color: "#FF6080" }];
            setDraft(next);
          }}
          style={btn("ghost")}
        >
          + Register badge
        </button>
        <span style={{ fontSize: 11, color: t.muted }}>Up to {BADGE_REGISTRY_MAX} entries. Matches profile badge text (case-insensitive).</span>
      </div>
    </div>
  );
}

/** ---------- site settings ---------- */
function SitePane({ viewer, onError }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const isAdmin = viewer.role === "admin";

  useEffect(() => {
    let cancel = false;
    jsonFetch("/api/admin/site")
      .then((d) => !cancel && setSettings(d.settings || {}))
      .catch(onError);
    return () => { cancel = true; };
  }, [onError]);

  async function save(patch) {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const data = await jsonFetch("/api/admin/site", { method: "PATCH", body: JSON.stringify(patch) });
      setSettings(data.settings || {});
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <Skeleton />;

  return (
    <>
      <section style={panel}>
        <header style={panelHeader}>
          <span>Forum-wide policies</span>
          {!isAdmin && <span style={tag("warn")}>read-only (admins only)</span>}
        </header>

        <SettingRow
          title="Registration is open"
          hint="When off, the public sign-up form returns an error."
          value={!!settings.registrationOpen}
          onChange={(v) => save({ registrationOpen: v })}
          disabled={!isAdmin}
        />
        <SettingRow
          title="Allow guest read-only browsing"
          hint="Anonymous visitors can read posts without an account."
          value={!!settings.guestReadOnly}
          onChange={(v) => save({ guestReadOnly: v })}
          disabled={!isAdmin}
        />
        <SettingRow
          title="Require email verification"
          hint="New accounts must verify their email before posting (mock; not enforced yet)."
          value={!!settings.requireEmailVerification}
          onChange={(v) => save({ requireEmailVerification: v })}
          disabled={!isAdmin}
        />
        <SettingRow
          title="Auto-moderate link posts"
          hint="Hold posts that contain links for review (mock)."
          value={!!settings.autoModLinkPosts}
          onChange={(v) => save({ autoModLinkPosts: v })}
          disabled={!isAdmin}
        />

        <div style={row}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>Banned word list</div>
            <div style={{ color: t.muted, fontSize: 12 }}>Comma- or newline-separated. Stored in <code style={code}>ccs_site_settings.bannedWords</code>.</div>
          </div>
          <textarea
            disabled={!isAdmin}
            defaultValue={(settings.bannedWords || []).join("\n")}
            onBlur={(e) => {
              const list = e.target.value.split(/[\n,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
              save({ bannedWords: list });
            }}
            style={{ ...inp(280), height: 88, resize: "vertical", fontFamily: "var(--font-geist-mono, monospace)" }}
          />
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${t.border}`, paddingBottom: 4 }}>
          <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>Badge registry</div>
          <div style={{ color: t.muted, fontSize: 12, marginTop: 4, maxWidth: 760, lineHeight: 1.5 }}>
            Each row is one forum badge label and its accent colour. Matching profile badge text uses the same logic as before (exact, then case-insensitive). Visible on profiles and hover cards after landing data refreshes.
          </div>
          <BadgeRegistryEditor
            key={JSON.stringify(settings.badgeRegistry || [])}
            registry={settings.badgeRegistry || []}
            disabled={!isAdmin}
            onSave={(reg) => save({ badgeRegistry: reg })}
          />
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
          <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>Profile field dropdowns</div>
          <div style={{ color: t.muted, fontSize: 12, marginTop: 4, marginBottom: 12, maxWidth: 760 }}>
            One value per line — used in the forum profile editor (each field stays left-aligned inside this column). Stored in <code style={code}>profileFieldOptions</code>.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "12px 0 16px", maxWidth: 720 }}>
            {PROFILE_OPTION_FIELDS.map(([fieldKey, title]) => (
              <div key={fieldKey} style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>{title}</div>
                <textarea
                  key={(settings.profileFieldOptions?.[fieldKey] || []).join("\n")}
                  disabled={!isAdmin}
                  defaultValue={(settings.profileFieldOptions?.[fieldKey] || []).join("\n")}
                  onBlur={(e) => {
                    const list = e.target.value
                      .split(/[\n]+/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 96);
                    save({ profileFieldOptions: { [fieldKey]: list } });
                  }}
                  spellCheck={false}
                  placeholder={"BS Computer Science\nBS Information Technology"}
                  style={{
                    ...inp(undefined),
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    height: 96,
                    resize: "vertical",
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {saving && <div style={{ padding: "8px 16px", fontSize: 12, color: t.muted }}>Saving…</div>}
      </section>
    </>
  );
}

function SettingRow({ title, hint, value, onChange, disabled }) {
  return (
    <div style={row}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>{title}</div>
        {hint && <div style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{hint}</div>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange?.(!value)}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: disabled ? 0.55 : 1, background: "transparent", border: "none", cursor: disabled ? "not-allowed" : "pointer", padding: 0 }}
      >
        <span style={{ width: 44, height: 24, borderRadius: 999, border: `1px solid ${t.border}`, background: value ? "linear-gradient(135deg, rgba(255,96,128,0.45), rgba(155,0,40,0.65))" : "rgba(255,255,255,0.06)", position: "relative", display: "inline-block" }}>
          <span style={{ width: 18, height: 18, borderRadius: 999, background: "rgba(255,255,255,0.95)", position: "absolute", top: 2.5, left: value ? 22 : 4, transition: "left 0.18s" }} />
        </span>
      </button>
    </div>
  );
}

/** ---------- bits ---------- */
function Skeleton() {
  return <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>Loading…</div>;
}

/** ---------- styles ---------- */
const shell = { display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" };
const asideCol = { borderRight: `1px solid ${t.border}`, background: "rgba(15,0,8,0.65)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" };
const mainCol = { minWidth: 0 };
const topbar = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.75rem", borderBottom: `1px solid ${t.border}`, background: "rgba(20,0,10,0.50)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 5 };
const errorBanner = { margin: "12px 1.75rem 0", padding: "10px 14px", border: "1px solid rgba(255,80,100,0.40)", background: "rgba(255,80,100,0.10)", color: "#ffb1c1", borderRadius: 12, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 };
const statGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 };
const code = { background: "rgba(255,255,255,0.06)", border: `1px solid ${t.border}`, padding: "1px 6px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" };

function inp(w) {
  return {
    width: w || 220,
    boxSizing: "border-box",
    borderRadius: 10,
    border: `1px solid ${t.border}`,
    background: "rgba(255,255,255,0.04)",
    color: t.text,
    padding: "8px 10px",
    outline: "none",
    fontSize: 13,
  };
}

function navItem(active) {
  return {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid transparent",
    background: active ? "linear-gradient(90deg, rgba(160,0,40,0.55), rgba(160,0,40,0.10))" : "transparent",
    color: active ? "#fff" : t.text,
    cursor: "pointer",
    display: "flex",
    gap: 10,
    alignItems: "center",
    fontWeight: active ? 900 : 700,
    fontSize: 13,
  };
}
