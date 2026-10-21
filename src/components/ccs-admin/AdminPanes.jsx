"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CcsMarkdown } from "@/components/ccs-talks/components/CcsMarkdown";
import { BADGE_REGISTRY_MAX, badgeAccentForLabel, badgePillColors, normalizeHexColor } from "@/lib/ccs/badgeColors";
import { canManageUser } from "@/lib/ccs/staffPolicy.mjs";
import { applyMarkdownInsert, MarkdownToolbarRow } from "./markdownTools";
import { adminTheme as t, btn, panel, panelHeader, row, tag } from "./adminUi";
import { jsonFetch } from "./adminFetch";

const ANNOUNCE_MD_TOKENS = { text: t.text, textMuted: t.muted, textStrong: t.textStrong, accent: t.accent, border: t.border, surfaceAlt: t.surfaceAlt };

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

function userHasBadgeInsensitive(list, label) {
  const low = String(label || "").trim().toLowerCase();
  if (!low) return false;
  return list.some((x) => String(x || "").trim().toLowerCase() === low);
}

function findCanonicalBadgeLabel(badgeRegistry, raw) {
  const t = String(raw || "").trim();
  if (!t) return null;
  const low = t.toLowerCase();
  for (const r of badgeRegistry) {
    const lb = String(r?.label ?? "").trim();
    if (lb && lb.toLowerCase() === low) return lb;
  }
  return null;
}

function BadgesEditor({ userId, badges, badgeRegistry, badgeColors, onSave }) {
  const [draft, setDraft] = useState("");
  const list = Array.isArray(badges) ? badges : [];
  const registry = Array.isArray(badgeRegistry) ? badgeRegistry : [];
  const bpTok = { text: t.text, border: t.border, surfaceAlt: t.surfaceAlt };

  const suggestions = useMemo(
    () =>
      [...new Set((Array.isArray(badgeRegistry) ? badgeRegistry : []).map((r) => String(r?.label ?? "").trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [badgeRegistry],
  );

  const toAssign = useMemo(() => {
    const reg = Array.isArray(badgeRegistry) ? badgeRegistry : [];
    const li = Array.isArray(badges) ? badges : [];
    return reg.filter((r) => String(r?.label ?? "").trim() && !userHasBadgeInsensitive(li, r.label));
  }, [badgeRegistry, badges]);

  function tryAdd(raw) {
    const v = String(raw || "").trim().slice(0, 40);
    if (!v || list.length >= 8) return false;
    let label = v;
    if (registry.length > 0) {
      const canon = findCanonicalBadgeLabel(registry, v);
      if (!canon) return false;
      label = canon.slice(0, 40);
    }
    if (userHasBadgeInsensitive(list, label)) return false;
    onSave([...list, label]);
    return true;
  }

  const datalistId = `badge-registry-${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, maxWidth: 560 }}>
      {registry.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: t.muted }}>FROM REGISTRY</span>
          {toAssign.map((r) => {
            const lb = String(r.label).trim();
            const acc = normalizeHexColor(r.color) || badgeAccentForLabel(badgeColors || {}, lb);
            const pill = badgePillColors(acc, false, bpTok);
            return (
              <button
                key={r.id || lb}
                type="button"
                disabled={list.length >= 8}
                onClick={() => {
                  if (tryAdd(lb)) setDraft("");
                }}
                style={{
                  cursor: list.length >= 8 ? "not-allowed" : "pointer",
                  border: `1px solid ${pill.border}`,
                  background: pill.background,
                  color: pill.color,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  borderRadius: 999,
                  opacity: list.length >= 8 ? 0.5 : 1,
                }}
                title={`Add “${lb}”`}
              >
                + {lb}
              </button>
            );
          })}
          {toAssign.length === 0 ? (
            <span style={{ fontSize: 11, color: t.muted }}>All registered badges are on this profile.</span>
          ) : null}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: t.muted, lineHeight: 1.45 }}>
          No badge registry yet — add badges under <strong>Site settings</strong> first, or type a custom label below (no custom accent until registered).
        </div>
      )}

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
        <input
          list={registry.length ? datalistId : undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={registry.length ? "Pick or type registered label…" : "Add badge label…"}
          style={{ ...inp(220), fontSize: 12, flex: "1 1 160px", minWidth: 0 }}
        />
        {registry.length > 0 ? (
          <datalist id={datalistId}>
            {suggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (tryAdd(draft)) setDraft("");
          }}
          style={{ ...btn("ghost"), padding: "6px 10px", fontSize: 12 }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

/** Faculty / leadership title for student accounts; admin & moderator chips come from account role. */
function PublicRoleBadgeControl({ profile, role, userId, patchUser }) {
  const pr = profile?.publicRoleBadge;
  const v = pr && ["teacher", "instructor", "dean", "professor"].includes(pr) ? pr : "";
  const isElevated = role === "admin" || role === "moderator";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, width: "100%", maxWidth: 440 }}>
      <span style={{ fontSize: 11, color: t.muted, lineHeight: 1.45 }}>
        {isElevated ? (
          <>
            Account role <strong>{role}</strong> — their status chip shows <strong>{role === "admin" ? "Administrator" : "Moderator"}</strong>. You can still clear a stored faculty value below; it does not change the role chip.
          </>
        ) : (
          <>Optional title next to their name. Leave <strong>None</strong> for regular students (no status chip).</>
        )}
      </span>
      <select
        value={v}
        onChange={(e) => {
          const raw = e.target.value;
          const next = raw ? raw : null;
          void patchUser(userId, { profile: { publicRoleBadge: next } });
        }}
        style={{ width: "100%", boxSizing: "border-box", maxWidth: 440 }}
      >
        <option value="">None</option>
        <option value="teacher">Teacher</option>
        <option value="instructor">Instructor</option>
        <option value="dean">Dean</option>
        <option value="professor">Professor</option>
      </select>
    </div>
  );
}

function StaffForumProfileFold({ user, patchUser }) {
  const [form, setForm] = useState(() => staffProfileSnapshot(user.profile));

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
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>NAME</div>
        <input value={form.name} onChange={setField("name")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>HANDLE</div>
        <input value={form.handle} onChange={setField("handle")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BIO</div>
        <textarea value={form.bio} onChange={setField("bio")} rows={3} style={{ ...inp(520), height: 72, resize: "vertical", fontFamily: "inherit", fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>COLLEGE</div>
        <input value={form.college} onChange={setField("college")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>PROGRAM</div>
        <input value={form.program} onChange={setField("program")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>CAMPUS</div>
        <input value={form.campus} onChange={setField("campus")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>YEAR</div>
        <input value={form.year} onChange={setField("year")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>FOCUS</div>
        <input value={form.focus} onChange={setField("focus")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>ORG</div>
        <input value={form.org} onChange={setField("org")} style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>SIGNATURE</div>
        <textarea value={form.signature} onChange={setField("signature")} rows={2} style={{ ...inp(520), height: 52, resize: "vertical", fontFamily: "inherit", fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>SIGNATURE LINK (https…)</div>
        <input value={form.signatureLink} onChange={setField("signatureLink")} style={{ ...inp(520), fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>AVATAR IMAGE URL</div>
        <input value={form.avatarImage} onChange={setField("avatarImage")} style={{ ...inp(520), fontSize: 12 }} />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BANNER IMAGE URL</div>
        <input value={form.bannerImage} onChange={setField("bannerImage")} style={{ ...inp(520), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>AVATAR ACCENT</div>
        <input value={form.avatarAccent} onChange={setField("avatarAccent")} placeholder="#ff6080" style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>AVATAR COLOR</div>
        <input value={form.avatarColor} onChange={setField("avatarColor")} placeholder="#9b0028" style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BANNER ACCENT</div>
        <input value={form.bannerAccent} onChange={setField("bannerAccent")} placeholder="#ff3a6e" style={{ ...inp(200), fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BANNER COLOR</div>
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
      <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: t.textStrong, userSelect: "none" }}>Forum profile (staff)</summary>
      <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", maxWidth: 720 }}>{fld}</div>
    </details>
  );
}

export function UsersPane({ viewer, onError, selectedUser = null }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [siteBadgeColors, setSiteBadgeColors] = useState({});
  const [siteBadgeRegistry, setSiteBadgeRegistry] = useState([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedUser) { setUsers([selectedUser]); return; }
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
  }, [q, roleFilter, onError, selectedUser]);

  useEffect(() => {
    const t = setTimeout(reload, 200);
    return () => clearTimeout(t);
  }, [reload]);

  useEffect(() => {
    let alive = true;
    void jsonFetch("/api/admin/site")
      .then((d) => {
        if (!alive) return;
        const bc = d?.settings?.badgeColors;
        setSiteBadgeColors(bc && typeof bc === "object" ? bc : {});
        setSiteBadgeRegistry(Array.isArray(d?.settings?.badgeRegistry) ? d.settings.badgeRegistry : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function patchUser(id, patch) {
    try {
      const data = await jsonFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ ...patch, expectedVersion: users.find(user => user.id === id)?.version }) });
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
                  <span style={{ fontWeight: 600, color: t.textStrong, fontSize: 14 }}>{u.profile?.name || u.email}</span>
                  <span style={tag(u.role === "admin" ? "good" : u.role === "moderator" ? "warn" : "neutral")}>{u.role}</span>
                  {u.banned && <span style={tag("bad")}>banned</span>}
                  {u.id === viewer.id && <span style={tag("good")}>you</span>}
                </div>
                <div style={{ fontSize: 12, color: t.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  @{u.profile?.handle || "—"} · {u.email} · <code style={code}>{u.id}</code>
                </div>
                {u.banned && u.bannedReason && <div style={{ fontSize: 12, color: t.bad, marginTop: 2 }}>“{u.bannedReason}”</div>}
                {canManageUser(viewer, u) ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>STATUS</div>
                    <input
                      title="Visible on profile — students cannot edit this themselves."
                      defaultValue={u.profile?.status || ""}
                      onBlur={(e) => patchUser(u.id, { status: e.target.value.trim() })}
                      placeholder="e.g. Student · Dean’s Lister"
                      style={{ ...inp(260), fontSize: 12 }}
                    />
                  </div>
                ) : null}

                {canManageUser(viewer, u) ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>STATUS BADGE (FORUM)</div>
                    <PublicRoleBadgeControl profile={u.profile} role={u.role} userId={u.id} patchUser={patchUser} />
                  </div>
                ) : null}

                {canManageUser(viewer, u) && <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: t.muted, marginBottom: 4 }}>BADGES</div>
                  <BadgesEditor
                    userId={u.id}
                    badges={u.profile?.badges}
                    badgeRegistry={siteBadgeRegistry}
                    badgeColors={siteBadgeColors}
                    onSave={(next) => void patchUser(u.id, { badges: next })}
                  />
                </div>}
                {canManageUser(viewer, u) ? <StaffForumProfileFold user={u} patchUser={patchUser} /> : null}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {viewer.role === "admin" && (
                <select aria-label={`Role for ${u.profile?.name || u.email}`} value={u.role} onChange={(e) => patchUser(u.id, { role: e.target.value })} style={{ ...inp(140) }}>
                  <option value="student">student</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
              )}
              {!u.banned && canManageUser(viewer, u, "ban") && (
                <button onClick={() => {
                  const reason = window.prompt("Reason for banning this user?", "Violation of community guidelines.");
                  if (reason == null) return;
                  patchUser(u.id, { banned: true, bannedReason: reason });
                }} style={btn("danger")}>Ban</button>
              )}
              {u.banned && canManageUser(viewer, u, "ban") && (
                <button onClick={() => patchUser(u.id, { banned: false })} style={btn("solid")}>Unban</button>
              )}
              {viewer.role === "admin" && u.id !== viewer.id && (
                <button onClick={() => removeUser(u.id)} style={btn("danger")}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </section>

      {viewer.role === "admin" && !selectedUser && (
        <section style={panel}>
          <header style={panelHeader}>Onboard another administrator</header>
          <p style={{ padding: 16, margin: 0, fontSize: 13, color: t.muted, lineHeight: 1.6 }}>
            Promote an existing account using its role selector above. Public administrator registration is disabled.
          </p>
        </section>
      )}
    </>
  );
}

/** ---------- posts ---------- */
export function PostsPane({ onError, selectedPost = null }) {
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
      if (selectedPost) { setPosts([selectedPost]); return; }
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const data = await jsonFetch(`/api/admin/posts?${params.toString()}`);
      setPosts(data.posts || []);
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }, [q, onError, selectedPost]);

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
              background: t.surface,
              boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
              padding: "1.25rem 1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div id="ccs-admin-post-edit-title" style={{ fontWeight: 600, fontSize: 17, color: t.textStrong }}>Edit post (markdown)</div>
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
              <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.surfaceAlt, fontSize: 13 }}>
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

/** ---------- announcements ---------- */
export function AnnouncementsPane({ viewer, onError, selectedAnnouncement, composeOnly = false }) {
  const rows = selectedAnnouncement ? [selectedAnnouncement] : [];
  const [published, setPublished] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [mdPreview, setMdPreview] = useState(false);
  const mdTaRef = useRef(null);

  const mdTokToolbar = useMemo(() => ({ accent: t.accent, border: t.border, text: t.text, muted: t.muted, surfaceAlt: t.surfaceAlt }), []);

  const isAdmin = viewer.role === "admin";

  async function create() {
    try {
      await jsonFetch("/api/admin/announcements", { method: "POST", body: JSON.stringify({ title, body, pinned }) });
      setTitle("");
      setBody("");
      setPinned(false);
      setPublished(true);
    } catch (e) {
      onError(e);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await jsonFetch(`/api/admin/announcements/${encodeURIComponent(id)}`, { method: "DELETE" });

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
      {published && <p role="status" style={{ color: t.accent }}>Published. Your announcement is in the list.</p>}
      {isAdmin && !selectedAnnouncement ? (
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
              <div style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.surfaceAlt, fontSize: 13 }}>
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
      ) : !isAdmin ? (
        <section style={panel}>
          <header style={panelHeader}>Announcements</header>
          <div style={{ padding: 16, fontSize: 13, color: t.muted }}>Only administrators can create or delete announcements. You can review the list below.</div>
        </section>
      ) : null}

      <section style={panel}>
        <header style={panelHeader}>Public feed · {rows.length}</header>
        {rows.length === 0 && <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>No announcements.</div>}
        {rows.map((a) => (
          <div key={a.id} style={row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: t.textStrong }}>{a.pinned ? "📌 " : ""}{a.title}</div>
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

export function TicketStaffRow({ tk, onError, onSaved }) {
  const [ticket,setTicket]=useState(tk);
  const [reply,setReply]=useState("");
  const [status,setStatus]=useState(tk.status || "open");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const requestId=useRef(null);
  const pending=useRef(false);
  async function save() {
    if (pending.current) return;
    pending.current=true;setSaving(true); setMessage("");
    if (!requestId.current) requestId.current=crypto.randomUUID();
    try {
      const out=await jsonFetch(`/api/admin/tickets/${encodeURIComponent(tk.id)}`,{method:"PATCH",body:JSON.stringify({status,message:reply,requestId:requestId.current,expectedVersion:ticket.version})});
      setTicket(out.ticket); setReply(""); requestId.current=null; setMessage("Ticket saved.");
      onSaved();
    } catch(error) {onError(error);} finally {pending.current=false;setSaving(false);}
  }
  async function reloadTicket(){
    if((reply.trim() || status!==ticket.status) && !window.confirm("Discard this ticket draft and reload the latest conversation?"))return;
    try{const out=await jsonFetch(`/api/admin/tickets?id=${encodeURIComponent(ticket.id)}`);const latest=out.tickets?.[0];if(!latest)throw new Error("Ticket no longer exists.");setTicket(latest);setStatus(latest.status);setReply("");requestId.current=null;setMessage("Latest ticket loaded.");}catch(error){onError(error);}
  }
  const messages=ticket.messages?.length ? ticket.messages : ticket.staffReply ? [{id:"legacy",body:ticket.staffReply,authorId:"legacy_staff",createdAt:ticket.updatedAt}] : [];
  return <div className="admin-editor">
    <div className="inspector-preview"><p className="inspector-caption">From {ticket.userId}</p><p style={{whiteSpace:"pre-wrap"}}>{ticket.body}</p></div>
    <section aria-label="Ticket conversation" className="admin-conversation">{messages.map(entry=><article key={entry.id} className="inspector-preview"><p className="inspector-caption">{entry.authorId==="legacy_staff" ? "Previous staff reply" : `Staff ${entry.authorId}`} · {new Date(Number(entry.createdAt)).toLocaleString()}</p><p style={{whiteSpace:"pre-wrap"}}>{entry.body}</p></article>)}</section>
    <label className="admin-field">New reply<textarea aria-label="New reply" value={reply} maxLength={4000} rows={5} disabled={saving} onChange={event=>{setReply(event.target.value);requestId.current=null;}} placeholder="Write a reply visible to the ticket owner" /></label>
    <label className="admin-field">Ticket status<select aria-label="Ticket status" value={status} disabled={saving} onChange={event=>setStatus(event.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label>
    <div className="inspector-actions"><button className="inspector-button primary" disabled={saving || (!reply.trim() && status===ticket.status)} onClick={save}>{saving ? "Saving…" : reply.trim() ? "Send reply and save" : "Save status"}</button><button className="inspector-button" disabled={saving} onClick={reloadTicket}>Reload ticket</button><span className="inspector-caption">Replies are retained in the conversation history.</span></div>
    {message && <p role="status">{message}</p>}
  </div>;
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
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", minWidth: 0 }}>
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
              style={{ width: 42, height: 32, padding: 2, border: `1px solid ${t.border}`, borderRadius: 8, background: t.surfaceAlt, cursor: disabled ? "not-allowed" : "pointer" }}
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
export function SitePane({ viewer, onError }) {
  const [loadError,setLoadError]=useState("");
  const [savedMessage,setSavedMessage]=useState("");
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const isAdmin = viewer.role === "admin";

  useEffect(() => {
    let cancel = false;
    jsonFetch("/api/admin/site")
      .then((d) => !cancel && setSettings(d.settings || {}))
      .catch(error=>{setLoadError(error.message);onError(error);});
    return () => { cancel = true; };
  }, [onError]);

  async function save(patch) {
    if (!isAdmin || saving) return;
    setSaving(true);
    try {
      const data = await jsonFetch("/api/admin/site", { method: "PATCH", body: JSON.stringify({ ...patch, expectedVersion: settings.version }) });
      setSettings(data.settings || {}); setSavedMessage("Settings saved.");
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return loadError ? <div role="alert">{loadError}<button className="inspector-button" onClick={()=>window.location.reload()}>Retry settings</button></div> : <Skeleton />;

  return (
    <>
      {savedMessage && <p role="status">{savedMessage}</p>}
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
          disabled={!isAdmin || saving}
        />
        <SettingRow
          title="Allow guest read-only browsing"
          hint="Anonymous visitors can read posts without an account."
          value={!!settings.guestReadOnly}
          onChange={(v) => save({ guestReadOnly: v })}
          disabled={!isAdmin || saving}
        />
        <SettingRow
          title="Require email verification"
          hint="Unavailable until email verification is implemented."
          value={false}
          onChange={() => {}}
          disabled
        />
        <SettingRow
          title="Auto-moderate link posts"
          hint="Unavailable until the review queue is implemented."
          value={false}
          onChange={() => {}}
          disabled
        />

        <div style={row}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>Banned word list</div>
            <div style={{ color: t.muted, fontSize: 12 }}>Comma- or newline-separated. Stored in <code style={code}>ccs_site_settings.bannedWords</code>.</div>
          </div>
          <textarea
            disabled={!isAdmin || saving}
            aria-label="Banned word list"
            defaultValue={(settings.bannedWords || []).join("\n")}
            onBlur={(e) => {
              const list = e.target.value.split(/[\n,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
              save({ bannedWords: list });
            }}
            style={{ ...inp(280), height: 88, resize: "vertical", fontFamily: "var(--font-geist-mono, monospace)" }}
          />
        </div>

        <div style={{ ...row, flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", gap: 12 }}>
          <div style={{ flex: "0 0 auto", minWidth: 0, width: "100%" }}>
            <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>Badge registry</div>
            <div style={{ color: t.muted, fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              Each row is one forum badge label and its accent colour. Matching profile badge text uses the same logic as before (exact, then case-insensitive). Visible on profiles and hover cards after landing data refreshes.
            </div>
          </div>
          <BadgeRegistryEditor
            key={JSON.stringify(settings.badgeRegistry || [])}
            registry={settings.badgeRegistry || []}
            disabled={!isAdmin || saving}
            onSave={(reg) => save({ badgeRegistry: reg })}
          />
        </div>

        <div style={{ ...row, flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", gap: 12 }}>
          <div style={{ flex: "0 0 auto", minWidth: 0, width: "100%" }}>
            <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>Profile field dropdowns</div>
            <div style={{ color: t.muted, fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              One value per line — used in the forum profile editor. Stored in <code style={code}>profileFieldOptions</code>.
            </div>
          </div>
          {PROFILE_OPTION_FIELDS.map(([fieldKey, title]) => (
            <div key={fieldKey} style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: t.textStrong, fontSize: 13 }}>{title}</div>
              <textarea
                aria-label={title}
                key={(settings.profileFieldOptions?.[fieldKey] || []).join("\n")}
                disabled={!isAdmin || saving}
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
                  minWidth: 0,
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  minHeight: 88,
                  resize: "vertical",
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: 12,
                }}
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
        role="switch"
        aria-label={title}
        aria-checked={value}
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
function inp(w) {
  return {
    width: w || 220,
    boxSizing: "border-box",
    borderRadius: 10,
    border: `1px solid ${t.border}`,
    background: t.surfaceAlt,
    color: t.text,
    padding: "8px 10px",
    fontSize: 13,
  };
}


function Skeleton() {
  return <div style={{ padding: 16, color: t.muted, fontSize: 13 }}>Loading…</div>;
}

/** ---------- styles ---------- */
const code = { background: "rgba(255,255,255,0.06)", border: `1px solid ${t.border}`, padding: "1px 6px", borderRadius: 6, fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" };
