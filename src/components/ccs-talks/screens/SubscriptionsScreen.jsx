"use client";

import { useState } from "react";
import { useAppState } from "../state/AppState";

const SUGGESTED_TAGS = ["General", "Academics", "Tech", "Events", "Career", "Internships", "Hackathons", "Study Groups"];

export function SubscriptionsScreen() {
  const { subs, toggleTagSub, setTagNotify, toggleFollow, users, posts, setPage, tokens, prefs } = useAppState();
  const isLight = prefs.mode === "light";
  const [tab, setTab] = useState("tags");
  const lastReadAt = Number(prefs.subsLastReadAt) || 0;
  const newAcrossForum = posts.filter((p) => Number(p.createdAt || 0) > lastReadAt).length;

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
        <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", fontSize: 18 }}>Subscriptions</div>
        <div style={{ color: tokens.textMuted, fontSize: 13 }}>
          Tags and people you&apos;re following — manage notifications per source.
          {" "}
          {newAcrossForum > 0 ? (
            <span style={{ opacity: 0.95 }}>
              {newAcrossForum} forum {newAcrossForum === 1 ? "post" : "posts"} newer than your last &quot;Mark read&quot; tap in Settings.
            </span>
          ) : null}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["tags", `Tags · ${subs.tags.length}`],
            ["people", `People · ${subs.follows.length}`],
            ["discover", "Discover"],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={pill(tab === k, tokens, isLight)}>{label}</button>
          ))}
        </div>

        {/* Tags */}
        {tab === "tags" && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {subs.tags.length === 0 && <Empty text="You aren't subscribed to any tags yet." tokens={tokens} />}
            {subs.tags.map((t) => (
              <Row key={t.tag} tokens={tokens}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Dot />
                  <div style={{ fontWeight: 900, color: tokens.textStrong }}>#{t.tag}</div>
                  <div style={{ color: tokens.textMuted, fontSize: 12 }}>
                    {posts.filter((p) => p.tag === t.tag).length} posts
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <SmallToggle checked={t.notify} onChange={(v) => setTagNotify(t.tag, v)} label="Notify" tokens={tokens} />
                  <button onClick={() => setPage("search")} style={btn("ghost", tokens)}>Browse</button>
                  <button onClick={() => toggleTagSub(t.tag)} style={btn("ghost", tokens)}>Unsubscribe</button>
                </div>
              </Row>
            ))}
          </div>
        )}

        {/* People */}
        {tab === "people" && (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {subs.follows.length === 0 && <Empty text="You aren't following anyone yet." gridSpan tokens={tokens} />}
            {subs.follows.map((id) => {
              const u = users[id];
              if (!u) return null;
              return (
                <PersonCard key={id} user={u} tokens={tokens} action={
                  <button onClick={() => toggleFollow(id)} style={btn("ghost", tokens)}>Unfollow</button>
                } />
              );
            })}
          </div>
        )}

        {/* Discover */}
        {tab === "discover" && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
            <Section title="Tags you might like" tokens={tokens}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGGESTED_TAGS.map((tag) => {
                  const isSubbed = subs.tags.find((t) => t.tag === tag);
                  return (
                    <button key={tag} onClick={() => toggleTagSub(tag)} style={isSubbed ? btn("solid", tokens) : btn("ghost", tokens)}>
                      {isSubbed ? "✓" : "+"} #{tag}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="People you might know" tokens={tokens}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {Object.values(users)
                  .filter((u) => u.id !== "u_you" && !subs.follows.includes(u.id))
                  .slice(0, 6)
                  .map((u) => (
                    <PersonCard key={u.id} user={u} tokens={tokens} action={
                      <button onClick={() => toggleFollow(u.id)} style={btn("solid", tokens)}>Follow</button>
                    } />
                  ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, tokens }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(14px)", padding: 14 }}>
      <div style={{ fontWeight: 900, color: tokens.textStrong, letterSpacing: "-0.2px", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ children, tokens }) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(12px)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

function PersonCard({ user, action, tokens }) {
  const av = user.avatarColor || "#9b0028";
  const avA = user.avatarAccent || "#ff6080";
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${tokens.cardBorder}`, background: tokens.surfaceAlt, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: user.avatarImage ? `url(${user.avatarImage}) center/cover no-repeat` : `linear-gradient(135deg, ${avA}, ${av})`, border: `1px solid ${tokens.border}` }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, color: tokens.textStrong, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
          <div style={{ color: tokens.textMuted, fontSize: 12 }}>@{user.handle}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

function Dot() {
  return <span style={{ width: 8, height: 8, borderRadius: 999, background: "linear-gradient(135deg, #ff6080, #9b0028)", display: "inline-block" }} />;
}

function Empty({ text, gridSpan, tokens }) {
  return <div style={{ gridColumn: gridSpan ? "1 / -1" : "auto", color: tokens.textMuted, fontSize: 13 }}>{text}</div>;
}

function SmallToggle({ checked, onChange, label, tokens }) {
  return (
    <button onClick={() => onChange?.(!checked)} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${tokens.border}`, background: tokens.surfaceAlt, padding: "6px 10px", borderRadius: 999, cursor: "pointer" }}>
      <span style={{ width: 28, height: 16, borderRadius: 999, background: checked ? "linear-gradient(135deg, rgba(255,96,128,0.45), rgba(155,0,40,0.65))" : "rgba(120,120,120,0.18)", position: "relative", border: `1px solid ${tokens.border}` }}>
        <span style={{ width: 12, height: 12, borderRadius: 999, background: "rgba(255,255,255,0.92)", position: "absolute", top: 1, left: checked ? 14 : 1 }} />
      </span>
      <span style={{ color: tokens.text, fontSize: 12, fontWeight: 800 }}>{label}</span>
    </button>
  );
}

function pill(active, tokens, isLight) {
  return {
    border: `1px solid ${tokens.border}`,
    background: active ? (isLight ? "rgba(60,0,20,0.10)" : "rgba(255,255,255,0.10)") : tokens.surfaceAlt,
    color: tokens.text,
    padding: "8px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  };
}

function btn(kind, tokens) {
  if (kind === "solid") {
    return {
      border: `1px solid ${tokens.borderStrong}`,
      background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.65))",
      color: "#fff",
      padding: "8px 10px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 850,
      fontSize: 12,
    };
  }
  return {
    border: `1px solid ${tokens.border}`,
    background: tokens.surface,
    color: tokens.text,
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 750,
    fontSize: 12,
  };
}
