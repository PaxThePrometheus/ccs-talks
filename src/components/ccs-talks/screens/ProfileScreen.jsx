"use client";

import { useMemo, useState } from "react";
import { useAppState } from "../state/AppState";
import { ProfileEditModal } from "../ui/ProfileEditModal";
import { AvatarBannerModal } from "../ui/AvatarBannerModal";
import { AccountCenterModal } from "../ui/AccountCenterModal";
import { PostCard } from "../components/PostCard";
import { PostDetailModal } from "../ui/PostDetailModal";

function withAlpha(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function ProfileScreen() {
  const { profile, setProfile, posts, users, likePost, toggleBookmark, sharePost, reportPost, setPosts, friends, tokens, prefs } = useAppState();
  const isLight = prefs.mode === "light";
  const [isEditing, setIsEditing] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [tab, setTab] = useState("posts"); // posts | about | friends | photos
  const [activePostId, setActivePostId] = useState(null);
  const [draft, setDraft] = useState("");
  const user = profile;

  const avatarColor = profile.avatarColor || "#9b0028";
  const avatarAccent = profile.avatarAccent || "#ff6080";
  const bannerColor = profile.bannerColor || "#3a0014";
  const bannerAccent = profile.bannerAccent || "#ff3a6e";

  const myPosts = useMemo(
    () => posts.filter((p) => p.userId === profile.id).sort((a, b) => Number(b.id) - Number(a.id)),
    [posts, profile.id]
  );

  const bannerStyle = profile.bannerImage
    ? { backgroundImage: `url(${profile.bannerImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {
        background: `
          radial-gradient(900px 420px at 70% 20%, ${withAlpha(bannerAccent, 0.30)}, transparent 62%),
          radial-gradient(700px 380px at 20% 60%, ${withAlpha(bannerAccent, 0.22)}, transparent 60%),
          linear-gradient(180deg, ${bannerColor}00 0%, ${bannerColor}D9 100%),
          ${bannerColor}
        `,
      };
  const avatarStyle = profile.avatarImage
    ? { backgroundImage: `url(${profile.avatarImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(135deg, ${avatarAccent}, ${avatarColor})` };

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
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Banner: taller, no overlay text. Avatar floats and overlaps the
            info plate below — so name/badges no longer cover the banner. */}
        <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", border: `1px solid ${tokens.cardBorder}`, boxShadow: isLight ? "0 14px 32px rgba(60,0,20,0.14)" : "0 22px 70px rgba(0,0,0,0.35)" }}>
          <div style={{ height: 320, ...bannerStyle }} />
          {/* top → bottom fade so the bottom blends into the info plate */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: isLight
                ? "linear-gradient(to bottom, rgba(255,245,247,0) 0%, rgba(255,245,247,0.45) 70%, rgba(255,245,247,0.95) 100%)"
                : "linear-gradient(to bottom, rgba(26,0,8,0) 0%, rgba(26,0,8,0.55) 70%, rgba(26,0,8,0.95) 100%)",
            }}
          />
          {!profile.bannerImage && (
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`, backgroundSize: "180px 180px", opacity: 0.30, maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0) 100%)" }} />
          )}
        </div>

        {/* Info plate: avatar overlaps upward, info+actions are vertically
            centered along the avatar's middle. */}
        <div
          style={{
            position: "relative",
            marginTop: -56,
            zIndex: 2,
            borderRadius: 22,
            border: `1px solid ${tokens.cardBorder}`,
            background: tokens.cardBg,
            backdropFilter: "blur(14px)",
            padding: "18px 20px 16px 152px",
            minHeight: 120,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            boxShadow: isLight ? "0 14px 32px rgba(60,0,20,0.10)" : "0 22px 70px rgba(0,0,0,0.30)",
          }}
        >
          {/* Avatar (overlapping upward) */}
          <button
            onClick={() => setEditingAvatar(true)}
            title="Edit avatar"
            style={{
              position: "absolute",
              left: 18,
              top: -56,
              width: 116,
              height: 116,
              border: "none",
              padding: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 116,
                height: 116,
                borderRadius: 30,
                border: `3px solid ${isLight ? "rgba(255,245,247,0.95)" : "rgba(20,0,8,0.95)"}`,
                boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
                ...avatarStyle,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: -6,
                bottom: -6,
                width: 32,
                height: 32,
                borderRadius: 999,
                background: isLight ? "rgba(255,255,255,0.95)" : "rgba(20,0,8,0.95)",
                border: `1px solid ${tokens.borderStrong}`,
                color: tokens.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              🖌
            </div>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950, fontSize: 22, color: tokens.textStrong, letterSpacing: "-0.5px" }}>{user.name}</div>
              <div style={{ color: tokens.textMuted, fontSize: 13 }}>@{user.handle}</div>
            </div>
            <div style={{ marginTop: 4, color: tokens.textMuted, fontSize: 13, lineHeight: 1.5 }}>
              {user.university} · {user.college} · {user.program}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <ChipT tone="good" tokens={tokens}>{user.status}</ChipT>
              <ChipT tokens={tokens}>{user.year}</ChipT>
              {(user.badges || []).slice(0, 3).map((b) => (<ChipT key={b} tokens={tokens}>{b}</ChipT>))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => setIsEditing(true)} style={headerBtn("ghost", tokens)}>Edit profile</button>
            <button onClick={() => setEditingAvatar(true)} style={headerBtn("solid", tokens)}>🖌 Cover</button>
          </div>
        </div>

        {/* Account Center plate (entry into the paginated modal) */}
        <button
          onClick={() => setAccountOpen(true)}
          style={{
            marginTop: 14,
            width: "100%",
            textAlign: "left",
            border: `1px solid ${tokens.cardBorder}`,
            background: tokens.cardBg,
            backdropFilter: "blur(12px)",
            borderRadius: 18,
            padding: "14px 16px",
            cursor: "pointer",
            color: tokens.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, rgba(255,96,128,0.25), rgba(155,0,40,0.55))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚙</div>
            <div>
              <div style={{ fontWeight: 900, color: tokens.textStrong }}>Account Center</div>
              <div style={{ color: tokens.textMuted, fontSize: 12 }}>Identity · Privacy · Notifications · Security · Your data</div>
            </div>
          </div>
          <div style={{ color: tokens.textMuted, fontWeight: 800 }}>Open →</div>
        </button>

        {/* Tabs */}
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[ ["posts", "Posts"], ["about", "About"], ["friends", "Friends"], ["photos", "Photos"] ].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={tabPill(tab === k, tokens, isLight)}>{label}</button>
          ))}
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 16, alignSelf: "start" }}>
            <div style={panelStyle(tokens, isLight)}>
              <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Intro</div>
              <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 13, lineHeight: 1.6 }}>{user.bio}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Chip>🌐 Campus: {user.campus}</Chip>
                <Chip>🧠 Focus: {user.focus}</Chip>
                <Chip>🧩 Org: {user.org}</Chip>
              </div>
              <div style={{ marginTop: 12, height: 1, background: tokens.divider }} />
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Stat k="Posts" v={String(myPosts.length)} tokens={tokens} />
                <Stat k="Bookmarks" v={String(posts.filter((p) => p.bookmarked).length)} tokens={tokens} />
                <Stat k="Likes" v={String(myPosts.reduce((s, p) => s + (p.likes || 0), 0))} tokens={tokens} />
                <Stat k="Badges" v={String((user.badges || []).length)} tokens={tokens} />
              </div>
            </div>

            <div style={{ marginTop: 12, ...panelStyle(tokens, isLight) }}>
              <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Badges</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(user.badges || []).map((b) => (<Badge key={b}>{b}</Badge>))}
              </div>
            </div>
          </div>

          <div>
            {tab === "posts" && (
              <>
                <div style={panelStyle(tokens, isLight)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Create post</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", color: tokens.textSubtle }}>TIMELINE</div>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Share an update…"
                      style={{ flex: 1, borderRadius: 14, border: `1px solid ${tokens.inputBorder}`, background: tokens.inputBg, color: tokens.text, padding: "10px 12px", outline: "none", fontSize: 13 }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = draft.trim();
                          if (!v) return;
                          const newPost = { id: Date.now(), userId: profile.id, avatar: "ME", time: "Just now", content: v, likes: 0, comments: 0, bookmarked: false, tag: prefs.defaultPostTag || "General" };
                          setPosts((ps) => [newPost, ...ps]);
                          setDraft("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const v = draft.trim();
                        if (!v) return;
                        const newPost = { id: Date.now(), userId: profile.id, avatar: "ME", time: "Just now", content: v, likes: 0, comments: 0, bookmarked: false, tag: prefs.defaultPostTag || "General" };
                        setPosts((ps) => [newPost, ...ps]);
                        setDraft("");
                      }}
                      style={{ border: `1px solid ${tokens.borderStrong}`, background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.60))", color: "#fff", padding: "10px 12px", borderRadius: 14, cursor: "pointer", fontWeight: 900, fontSize: 13 }}
                    >Post</button>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  {myPosts.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      user={users[p.userId]}
                      onLike={likePost}
                      onBookmark={toggleBookmark}
                      onShare={sharePost}
                      onReport={(id) => reportPost(id, "Reported from profile")}
                      onOpenComments={(id) => setActivePostId(id)}
                    />
                  ))}
                  {myPosts.length === 0 && <div style={{ color: tokens.textMuted, fontSize: 13 }}>No posts yet.</div>}
                </div>
              </>
            )}

            {tab === "about" && (
              <div style={panelStyle(tokens, isLight)}>
                <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>About</div>
                <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 13, lineHeight: 1.7 }}>
                  {user.university} · {user.college}<br />
                  {user.program} · {user.year}<br />
                  Campus: {user.campus}
                </div>
              </div>
            )}

            {tab === "friends" && (
              <div style={panelStyle(tokens, isLight)}>
                <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Friends · {friends.friends.length}</div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                  {friends.friends.map((id) => {
                    const u = users[id];
                    if (!u) return null;
                    const av = u.avatarColor || "#9b0028";
                    const avA = u.avatarAccent || "#ff6080";
                    return (
                      <div key={id} style={{ borderRadius: 14, border: `1px solid ${tokens.cardBorder}`, background: tokens.surfaceAlt, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 999, background: u.avatarImage ? `url(${u.avatarImage}) center/cover no-repeat` : `linear-gradient(135deg, ${avA}, ${av})` }} />
                        <div style={{ fontWeight: 900, color: tokens.textStrong, fontSize: 13, textAlign: "center" }}>{u.name}</div>
                        <div style={{ color: tokens.textSubtle, fontSize: 11 }}>@{u.handle}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "photos" && (
              <div style={panelStyle(tokens, isLight)}>
                <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Cover & avatar</div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button onClick={() => setEditingAvatar(true)} style={{ border: `1px solid ${tokens.cardBorder}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", padding: 0, height: 120, ...bannerStyle }} title="Edit banner" />
                  <button onClick={() => setEditingAvatar(true)} style={{ border: `1px solid ${tokens.cardBorder}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", padding: 0, height: 120, ...avatarStyle }} title="Edit avatar" />
                </div>
                <div style={{ marginTop: 10, color: tokens.textMuted, fontSize: 12 }}>Click any tile to upload an image or pick a gradient.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileEditModal open={isEditing} profile={profile} onCancel={() => setIsEditing(false)} onSave={(next) => { setProfile(next); setIsEditing(false); }} />
      <AvatarBannerModal open={editingAvatar} profile={profile} onCancel={() => setEditingAvatar(false)} onSave={(next) => { setProfile(next); setEditingAvatar(false); }} />
      <AccountCenterModal open={accountOpen} onCancel={() => setAccountOpen(false)} />
      <PostDetailModal open={activePostId != null} postId={activePostId} onClose={() => setActivePostId(null)} />
    </div>
  );
}

function Chip({ children, tone }) {
  const bg = tone === "good"
    ? "linear-gradient(135deg, rgba(100,220,160,0.18), rgba(60,160,120,0.12))"
    : "rgba(80,0,26,0.40)";
  const border = tone === "good" ? "rgba(140,255,200,0.18)" : "rgba(255,255,255,0.10)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, border: `1px solid ${border}`, background: bg, color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: 700, backdropFilter: "blur(12px)", whiteSpace: "nowrap" }}>{children}</span>
  );
}

// Theme-aware variant for the new info plate
function ChipT({ children, tone, tokens }) {
  const bg = tone === "good"
    ? "linear-gradient(135deg, rgba(100,220,160,0.20), rgba(60,160,120,0.14))"
    : tokens.surfaceAlt;
  const border = tone === "good" ? "rgba(140,200,170,0.30)" : tokens.border;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, border: `1px solid ${border}`, background: bg, color: tokens.text, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{children}</span>
  );
}

function Badge({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(20,0,8,0.42)", color: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: 800, letterSpacing: "-0.1px", backdropFilter: "blur(12px)" }}>{children}</span>
  );
}

function panelStyle(tokens, isLight) {
  return {
    borderRadius: 18,
    border: `1px solid ${tokens.cardBorder}`,
    background: tokens.cardBg,
    backdropFilter: "blur(14px)",
    padding: 16,
    boxShadow: isLight ? "0 12px 24px rgba(60,0,20,0.08)" : "0 18px 60px rgba(0,0,0,0.28)",
    color: tokens.text,
  };
}

function tabPill(active, tokens, isLight) {
  return {
    border: `1px solid ${tokens.border}`,
    background: active ? (isLight ? "rgba(60,0,20,0.10)" : "rgba(255,255,255,0.10)") : tokens.surfaceAlt,
    color: tokens.text,
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: "-0.1px",
  };
}

function Stat({ k, v, tokens }) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${tokens.cardBorder}`, background: tokens.surfaceAlt, padding: "10px 10px" }}>
      <div style={{ fontSize: 12, color: tokens.textMuted }}>{k}</div>
      <div style={{ marginTop: 2, fontWeight: 950, color: tokens.textStrong }}>{v}</div>
    </div>
  );
}

function headerBtn(kind, tokens) {
  if (kind === "solid") {
    return {
      border: `1px solid ${tokens?.borderStrong || "rgba(255,255,255,0.18)"}`,
      background: "linear-gradient(135deg, #c0002a, #8b0020)",
      color: "#fff",
      padding: "10px 12px",
      borderRadius: 14,
      cursor: "pointer",
      fontWeight: 850,
      fontSize: 13,
      boxShadow: "0 10px 24px rgba(155,0,40,0.25)",
    };
  }
  return {
    border: `1px solid ${tokens?.border || "rgba(255,255,255,0.18)"}`,
    background: tokens?.surface || "rgba(20,0,8,0.45)",
    color: tokens?.text || "#fff",
    padding: "10px 12px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
    backdropFilter: "blur(12px)",
  };
}
