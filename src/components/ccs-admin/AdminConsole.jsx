"use client";

import { useCallback, useEffect, useState } from "react";
import { CcsMarkdown } from "@/components/ccs-talks/components/CcsMarkdown";
import { badgeAccentForLabel, badgePillColors } from "@/lib/ccs/badgeColors";
import { AdminLandingPane } from "./AdminLandingPane";
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

function serializeBadgeColorsText(map) {
  if (!map || typeof map !== "object") return "";
  return Object.entries(map)
    .filter(([, v]) => typeof v === "string" && v.trim())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k} ${String(v).trim()}`)
    .join("\n");
}

/** Lines like `Dean's list #FF6080` (label … hex). */
function parseBadgeColorsText(text) {
  const out = {};
  const raw = text == null ? "" : String(text);
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const hm = trimmed.match(/^(.*?)\s+(#[0-9a-f]{3,6})\s*$/i);
    if (!hm) continue;
    const label = hm[1].trim();
    if (!label) continue;
    out[label] = hm[2];
  }
  return out;
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

/** ---------- announcements ---------- */
function AnnouncementsPane({ viewer, onError }) {
  const [rows, setRows] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

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

  return (
    <>
      {isAdmin ? (
        <section style={panel}>
          <header style={panelHeader}>Post announcement</header>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={inp(520)} />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Markdown body…" rows={6} style={{ ...inp(520), height: 140, resize: "vertical", fontFamily: "inherit" }} />
            <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5 }}>
              Markdown supported: <strong>**bold**</strong>, lists, <code style={code}>code</code>, links, tables. Mention users with{" "}
              <code style={code}>@handle</code>.
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

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
          <div style={{ ...row, marginTop: 4, alignItems: "start", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>Badge colours</div>
              <div style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>
                One line per badge label: <code style={code}>Label #RRGGBB</code> (or shorthand <code style={code}>#RGB</code>). Shown on profile and hover cards after the next landing refresh.
              </div>
            </div>
            <textarea
              key={JSON.stringify(settings.badgeColors || {})}
              disabled={!isAdmin}
              defaultValue={serializeBadgeColorsText(settings.badgeColors)}
              onBlur={(e) => {
                save({ badgeColors: parseBadgeColorsText(e.target.value) });
              }}
              placeholder={`Dean's Lister #FF6080`}
              spellCheck={false}
              style={{ ...inp(360), height: 120, resize: "vertical", fontFamily: "var(--font-geist-mono, monospace)", fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
          <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>Profile field dropdowns</div>
          <div style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>
            One value per line — used in the forum profile editor. Stored in <code style={code}>profileFieldOptions</code>.
          </div>
          {PROFILE_OPTION_FIELDS.map(([fieldKey, title]) => (
            <div key={fieldKey} style={{ ...row, marginTop: 12, alignItems: "start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>{title}</div>
              </div>
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
                style={{ ...inp(320), height: 96, resize: "vertical", fontFamily: "var(--font-geist-mono, monospace)" }}
              />
            </div>
          ))}
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
