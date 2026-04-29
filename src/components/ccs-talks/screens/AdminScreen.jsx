"use client";

import { useMemo, useState } from "react";
import { useAppState } from "../state/AppState";
import { MOCK_USERS } from "../config/appConfig";

const SECTIONS = [
  { key: "overview", icon: "📊", label: "Overview" },
  { key: "reports", icon: "🚩", label: "Reports queue" },
  { key: "posts", icon: "📰", label: "Posts" },
  { key: "users", icon: "👥", label: "Users" },
  { key: "audit", icon: "🧾", label: "Audit log" },
  { key: "site", icon: "🛠", label: "Site settings" },
];

export function AdminScreen() {
  const { tokens, prefs, profile, posts, users, reports, activities, bannedUserIds,
          deletePost, pinPost, banUser, unbanUser, resolveReport, updatePost } = useAppState();
  const isLight = prefs.mode === "light";
  const [section, setSection] = useState("overview");
  const [q, setQ] = useState("");

  const counts = useMemo(() => ({
    posts: posts.length,
    users: Object.keys(users).length,
    reports: reports.filter((r) => r.status === "open").length,
    banned: bannedUserIds.length,
    actions: activities.filter((a) => a.type?.startsWith("mod_")).length,
  }), [posts, users, reports, bannedUserIds, activities]);

  return (
    <div
      className="ccs-scroll"
      style={{
        position: "fixed", top: 0, left: "var(--ccs-shell-left)", right: 0, bottom: 0,
        overflowY: "auto", overflowX: "hidden",
        padding: "1.75rem var(--ccs-shell-pad-x) 2.5rem",
        borderLeft: `1px solid ${tokens.divider}`,
        color: tokens.text,
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", fontSize: 18 }}>Moderator / Admin</div>
            <div style={{ color: tokens.textMuted, fontSize: 13 }}>Signed in as <strong>{profile.name}</strong> · role: <strong>{profile.status}</strong></div>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by id, content, user…" style={{ ...inp(tokens, 280) }} />
        </div>

        <div className="ccs-stack-mobile" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "220px 1fr", gap: 14, alignItems: "start" }}>
          <aside style={{ position: "sticky", top: 14, alignSelf: "start", display: "flex", flexDirection: "column", gap: 4, padding: 8, borderRadius: 16, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(12px)" }}>
            {SECTIONS.map((s) => (
              <button key={s.key} onClick={() => setSection(s.key)} style={navItem(section === s.key, tokens, isLight)}>
                <span style={{ width: 18, textAlign: "center" }}>{s.icon}</span> {s.label}
              </button>
            ))}
          </aside>

          <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {section === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                  <Stat tokens={tokens} k="Posts" v={counts.posts} />
                  <Stat tokens={tokens} k="Users" v={counts.users} />
                  <Stat tokens={tokens} k="Open reports" v={counts.reports} />
                  <Stat tokens={tokens} k="Banned" v={counts.banned} />
                  <Stat tokens={tokens} k="Mod actions" v={counts.actions} />
                </div>
                <Panel title="Recent activity" tokens={tokens} isLight={isLight}>
                  {activities.slice(0, 8).map((a) => (
                    <Row key={a.id} tokens={tokens}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Tag tokens={tokens}>{a.type}</Tag>
                        <span style={{ color: tokens.textMuted, fontSize: 12 }}>{new Date(a.ts).toLocaleString()}</span>
                      </div>
                      <span style={{ color: tokens.textMuted, fontSize: 12 }}>by {users[a.userId]?.handle || a.userId || "—"}</span>
                    </Row>
                  ))}
                  {activities.length === 0 && <Empty tokens={tokens}>No activity yet.</Empty>}
                </Panel>
              </>
            )}

            {section === "reports" && (
              <Panel title={`Reports queue · ${reports.filter((r) => r.status === "open").length} open`} tokens={tokens} isLight={isLight}>
                {reports.length === 0 && <Empty tokens={tokens}>The queue is clear. Nice.</Empty>}
                {reports.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())).map((r) => {
                  const post = posts.find((p) => p.id === r.postId);
                  return (
                    <Row key={r.id} tokens={tokens}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <Tag tokens={tokens} tone={r.status === "open" ? "warn" : "good"}>{r.status}</Tag>
                          <span style={{ color: tokens.textMuted, fontSize: 12 }}>{new Date(r.ts).toLocaleString()}</span>
                          <span style={{ color: tokens.textMuted, fontSize: 12 }}>· reported by {users[r.by]?.handle || r.by}</span>
                        </div>
                        <div style={{ color: tokens.text, fontSize: 13 }}>"{r.reason}"</div>
                        <div style={{ color: tokens.textMuted, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {post ? post.content : `Post ${r.postId} (deleted)`}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {post && <button onClick={() => deletePost(post.id)} style={btn(tokens, "ghost")}>Delete post</button>}
                        {post && <button onClick={() => pinPost(post.id)} style={btn(tokens, "ghost")}>{post.pinned ? "Unpin" : "Pin"}</button>}
                        <button onClick={() => resolveReport(r.id, "resolved")} style={btn(tokens, "solid")}>Resolve</button>
                        <button onClick={() => resolveReport(r.id, "dismissed")} style={btn(tokens, "ghost")}>Dismiss</button>
                      </div>
                    </Row>
                  );
                })}
              </Panel>
            )}

            {section === "posts" && (
              <Panel title={`Posts · ${posts.length}`} tokens={tokens} isLight={isLight}>
                {posts.filter((p) => !q || (p.content || "").toLowerCase().includes(q.toLowerCase())).map((p) => (
                  <Row key={p.id} tokens={tokens}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Tag tokens={tokens}>{p.tag}</Tag>
                        {p.pinned && <Tag tokens={tokens} tone="good">📌 Pinned</Tag>}
                        <span style={{ color: tokens.textMuted, fontSize: 12 }}>by {users[p.userId]?.handle || p.userId}</span>
                        <span style={{ color: tokens.textMuted, fontSize: 12 }}>· {p.time}</span>
                      </div>
                      <div style={{ color: tokens.text, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.content}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => pinPost(p.id)} style={btn(tokens, "ghost")}>{p.pinned ? "Unpin" : "Pin"}</button>
                      <button onClick={() => updatePost(p.id, { content: p.content + " [edited by mod]" })} style={btn(tokens, "ghost")}>Mark edited</button>
                      <button onClick={() => deletePost(p.id)} style={btn(tokens, "ghost")}>Delete</button>
                    </div>
                  </Row>
                ))}
              </Panel>
            )}

            {section === "users" && (
              <Panel title={`Users · ${Object.keys(users).length}`} tokens={tokens} isLight={isLight}>
                {Object.values(users).filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.handle.toLowerCase().includes(q.toLowerCase())).map((u) => {
                  const isBanned = bannedUserIds.includes(u.id);
                  const isMock = !!MOCK_USERS[u.id];
                  return (
                    <Row key={u.id} tokens={tokens}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: u.avatarImage ? `url(${u.avatarImage}) center/cover no-repeat` : `linear-gradient(135deg, ${u.avatarAccent || "#ff6080"}, ${u.avatarColor || "#9b0028"})`, border: `1px solid ${tokens.border}` }} />
                        <div>
                          <div style={{ fontWeight: 800, color: tokens.textStrong }}>{u.name} {isMock ? <Tag tokens={tokens}>seed</Tag> : null} {u.id === profile.id ? <Tag tokens={tokens} tone="good">you</Tag> : null}</div>
                          <div style={{ color: tokens.textMuted, fontSize: 12 }}>@{u.handle} · {u.program} · {u.year}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button style={btn(tokens, "ghost")}>View profile</button>
                        {!isBanned && <button onClick={() => banUser(u.id)} style={btn(tokens, "ghost")}>Ban</button>}
                        {isBanned && <button onClick={() => unbanUser(u.id)} style={btn(tokens, "solid")}>Unban</button>}
                        {isBanned && <Tag tokens={tokens} tone="warn">BANNED</Tag>}
                      </div>
                    </Row>
                  );
                })}
              </Panel>
            )}

            {section === "audit" && (
              <Panel title="Audit log" tokens={tokens} isLight={isLight}>
                {activities.length === 0 && <Empty tokens={tokens}>No actions logged yet.</Empty>}
                {activities.filter((a) => !q || JSON.stringify(a).toLowerCase().includes(q.toLowerCase())).map((a) => (
                  <Row key={a.id} tokens={tokens}>
                    <div>
                      <div style={{ fontWeight: 800, color: tokens.textStrong, fontSize: 13 }}>{a.type}</div>
                      <div style={{ color: tokens.textMuted, fontSize: 12 }}>{new Date(a.ts).toLocaleString()} · {users[a.userId]?.handle || a.userId || "system"}</div>
                    </div>
                    <div style={{ color: tokens.textMuted, fontSize: 12 }}>{a.postId ? `post ${a.postId}` : ""} {a.reason ? `· "${a.reason}"` : ""}</div>
                  </Row>
                ))}
              </Panel>
            )}

            {section === "site" && (
              <Panel title="Site settings" tokens={tokens} isLight={isLight}>
                <Row tokens={tokens}><span style={{ color: tokens.text }}>Forum is open to new users</span><Toggle checked /></Row>
                <Row tokens={tokens}><span style={{ color: tokens.text }}>Allow guest read-only browsing</span><Toggle checked /></Row>
                <Row tokens={tokens}><span style={{ color: tokens.text }}>Require email verification</span><Toggle /></Row>
                <Row tokens={tokens}><span style={{ color: tokens.text }}>Auto-mod link posts (mock)</span><Toggle /></Row>
                <Row tokens={tokens}><span style={{ color: tokens.text }}>Banned word list</span><button style={btn(tokens, "ghost")}>Edit list</button></Row>
                <Row tokens={tokens}><span style={{ color: tokens.text }}>Open / Close registration</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={btn(tokens, "solid")}>Open</button>
                    <button style={btn(tokens, "ghost")}>Close</button>
                  </div>
                </Row>
              </Panel>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function navItem(active, tokens, isLight) {
  return {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid transparent",
    background: active ? (isLight ? "rgba(60,0,20,0.10)" : "linear-gradient(90deg, rgba(160,0,40,0.55), rgba(160,0,40,0.10))") : "transparent",
    color: tokens.text,
    cursor: "pointer",
    display: "flex",
    gap: 10,
    alignItems: "center",
    fontWeight: active ? 900 : 700,
    fontSize: 13,
  };
}

function Panel({ title, children, tokens, isLight }) {
  return (
    <section style={{ borderRadius: 16, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(12px)", overflow: "hidden", boxShadow: isLight ? "0 10px 22px rgba(60,0,20,0.08)" : "0 16px 40px rgba(0,0,0,0.30)" }}>
      <header style={{ padding: "10px 14px", borderBottom: `1px solid ${tokens.divider}`, fontWeight: 900, color: tokens.textStrong }}>{title}</header>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </section>
  );
}

function Row({ children, tokens }) {
  return (
    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: `1px solid ${tokens.divider}`, flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

function Stat({ k, v, tokens }) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(12px)", padding: "12px 14px" }}>
      <div style={{ color: tokens.textMuted, fontSize: 12, fontWeight: 700 }}>{k}</div>
      <div style={{ color: tokens.textStrong, fontSize: 22, fontWeight: 950, marginTop: 2 }}>{v}</div>
    </div>
  );
}

function Empty({ tokens, children }) {
  return <div style={{ padding: 14, color: tokens.textMuted, fontSize: 13 }}>{children}</div>;
}

function Tag({ tokens, tone, children }) {
  const palette = tone === "warn"
    ? { bg: "rgba(255,180,80,0.16)", color: "#c77b00", border: "rgba(255,180,80,0.30)" }
    : tone === "good"
    ? { bg: "rgba(120,220,160,0.18)", color: "#1e8a55", border: "rgba(120,220,160,0.30)" }
    : { bg: tokens.surfaceAlt, color: tokens.text, border: tokens.cardBorder };
  return (
    <span style={{ padding: "2px 8px", fontSize: 11, fontWeight: 900, borderRadius: 999, border: `1px solid ${palette.border}`, background: palette.bg, color: palette.color, letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}

function Toggle({ checked = false, onChange }) {
  return (
    <button type="button" onClick={() => onChange?.(!checked)} style={{ display: "inline-flex", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
      <span style={{ width: 44, height: 24, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: checked ? "linear-gradient(135deg, rgba(255,96,128,0.45), rgba(155,0,40,0.65))" : "rgba(120,120,120,0.20)", position: "relative", display: "inline-block" }}>
        <span style={{ width: 18, height: 18, borderRadius: 999, background: "rgba(255,255,255,0.95)", position: "absolute", top: 2.5, left: checked ? 22 : 4 }} />
      </span>
    </button>
  );
}

function inp(tokens, w) {
  return { width: w || 220, boxSizing: "border-box", borderRadius: 12, border: `1px solid ${tokens.inputBorder}`, background: tokens.inputBg, color: tokens.text, padding: "8px 10px", outline: "none", fontSize: 13 };
}

function btn(tokens, kind) {
  if (kind === "solid") {
    return { border: `1px solid ${tokens.borderStrong}`, background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.65))", color: "#fff", padding: "8px 10px", borderRadius: 12, cursor: "pointer", fontWeight: 850, fontSize: 12 };
  }
  return { border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.text, padding: "8px 10px", borderRadius: 12, cursor: "pointer", fontWeight: 750, fontSize: 12 };
}
