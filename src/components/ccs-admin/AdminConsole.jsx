"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLandingPane } from "./AdminLandingPane";
import { adminTheme as t, btn, panel, panelHeader, row, tag } from "./adminUi";

const SECTIONS = [
  { key: "overview", icon: "📊", label: "Overview" },
  { key: "landing", icon: "🖼", label: "Landing page" },
  { key: "users", icon: "👥", label: "Users & roles" },
  { key: "posts", icon: "📰", label: "Posts" },
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
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
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

/** ---------- overview ---------- */
function OverviewPane({ onError }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancel = false;
    jsonFetch("/api/admin/overview")
      .then((d) => !cancel && setData(d))
      .catch(onError);
    return () => { cancel = true; };
  }, [onError]);

  if (!data) return <Skeleton />;

  return (
    <>
      <div style={statGrid}>
        <Stat k="Users" v={data.totals.users} />
        <Stat k="Admins" v={data.totals.admins} accent />
        <Stat k="Moderators" v={data.totals.moderators} />
        <Stat k="Banned" v={data.totals.banned} tone={data.totals.banned > 0 ? "warn" : "muted"} />
        <Stat k="Posts" v={data.totals.posts} />
        <Stat k="Comments" v={data.totals.comments} />
      </div>

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
function UsersPane({ viewer, onError, inviteRequired }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

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

  async function patchUser(id, patch) {
    try {
      const data = await jsonFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
      if (data?.user) setUsers((xs) => xs.map((u) => (u.id === id ? data.user : u)));
    } catch (e) {
      onError(e);
    }
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

  async function pin(id, pinned) {
    try {
      await jsonFetch(`/api/admin/posts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ pinned }) });
      setPosts((xs) => xs.map((p) => (p.id === id ? { ...p, pinned } : p)));
    } catch (e) {
      onError(e);
    }
  }
  async function edit(p) {
    const next = window.prompt("Rewrite this post body:", p.content);
    if (next == null || next === p.content) return;
    try {
      await jsonFetch(`/api/admin/posts/${encodeURIComponent(p.id)}`, { method: "PATCH", body: JSON.stringify({ content: next }) });
      setPosts((xs) => xs.map((x) => (x.id === p.id ? { ...x, content: next } : x)));
    } catch (e) {
      onError(e);
    }
  }
  async function remove(id) {
    if (!window.confirm("Delete this post and all its comments?")) return;
    try {
      await jsonFetch(`/api/admin/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
      setPosts((xs) => xs.filter((p) => p.id !== id));
    } catch (e) {
      onError(e);
    }
  }

  return (
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
            <button onClick={() => pin(p.id, !p.pinned)} style={btn("ghost")}>{p.pinned ? "Unpin" : "Pin"}</button>
            <button onClick={() => edit(p)} style={btn("ghost")}>Edit body</button>
            <button onClick={() => remove(p.id)} style={btn("danger")}>Delete</button>
          </div>
        </div>
      ))}
    </section>
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
function Stat({ k, v, accent, tone }) {
  const valueColor = accent ? t.accent : tone === "warn" ? t.warn : tone === "muted" ? t.muted : t.textStrong;
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${t.border}`, background: t.surface, backdropFilter: "blur(12px)", padding: "14px 16px" }}>
      <div style={{ color: t.muted, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{k}</div>
      <div style={{ color: valueColor, fontSize: 28, fontWeight: 950, marginTop: 4 }}>{Number(v).toLocaleString()}</div>
    </div>
  );
}

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
