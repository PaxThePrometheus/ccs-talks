"use client";

import { useMemo, useState } from "react";
import { useAppState } from "../state/AppState";
import { showToast } from "../state/toastBus";

export function FriendsScreen() {
  const { friends, users, profile, acceptFriend, declineFriend, removeFriend, cancelOutgoing, sendFriendRequest, tokens, prefs } = useAppState();
  const isLight = prefs.mode === "light";
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  const viewerId = profile?.id;

  const suggestionsBase = useMemo(() => {
    return Object.keys(users).filter(
      (id) =>
        id &&
        id !== viewerId &&
        users[id] &&
        !friends.friends.includes(id) &&
        !friends.pending.includes(id) &&
        !friends.outgoing.includes(id),
    );
  }, [users, viewerId, friends]);

  const filterFn = (id) => {
    const u = users[id];
    if (!u) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return u.name.toLowerCase().includes(s) || u.handle.toLowerCase().includes(s);
  };

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", fontSize: 18 }}>Friends</div>
            <div style={{ color: tokens.textMuted, fontSize: 13 }}>Manage your circle, requests, and discover other students.</div>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search friends…"
            style={{
              border: `1px solid ${tokens.inputBorder}`,
              background: tokens.inputBg,
              color: tokens.text,
              padding: "8px 10px",
              borderRadius: 12,
              outline: "none",
              fontSize: 13,
              width: 260,
            }}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["all", `All · ${friends.friends.length}`],
            ["pending", `Requests · ${friends.pending.length}`],
            ["outgoing", `Sent · ${friends.outgoing.length}`],
            ["suggestions", "Suggestions"],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={pill(tab === k, tokens, isLight)}>{label}</button>
          ))}
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {tab === "all" && friends.friends.filter(filterFn).map((id) => (
            <FriendCard key={id} user={users[id]} tokens={tokens} actions={[
              {
                label: "Message",
                kind: "ghost",
                onClick: () => showToast("Direct messages are not available yet.", "info"),
              },
              { label: "Remove", kind: "ghost", onClick: () => void removeFriend(id) },
            ]} />
          ))}
          {tab === "all" && friends.friends.length === 0 && <Empty text="You don't have any friends yet — try Suggestions." tokens={tokens} />}

          {tab === "pending" && friends.pending.filter(filterFn).map((id) => (
            <FriendCard key={id} user={users[id]} tokens={tokens} actions={[
              { label: "Accept", kind: "solid", onClick: () => acceptFriend(id) },
              { label: "Decline", kind: "ghost", onClick: () => declineFriend(id) },
            ]} />
          ))}
          {tab === "pending" && friends.pending.length === 0 && <Empty text="No pending friend requests." tokens={tokens} />}

          {tab === "outgoing" && friends.outgoing.filter(filterFn).map((id) => (
            <FriendCard key={id} user={users[id]} tokens={tokens} actions={[
              { label: "Cancel request", kind: "ghost", onClick: () => void cancelOutgoing(id) },
            ]} />
          ))}
          {tab === "outgoing" && friends.outgoing.length === 0 && <Empty text="No outgoing requests." tokens={tokens} />}

          {tab === "suggestions" && suggestionsBase.filter(filterFn).map((id) => (
            <FriendCard key={id} user={users[id]} tokens={tokens} actions={[
              { label: "Add friend", kind: "solid", onClick: () => void sendFriendRequest(id) },
            ]} />
          ))}
          {tab === "suggestions" && suggestionsBase.length === 0 && (
            <Empty text="No suggestions yet — people who appear in your feed can show up here once their profiles load." tokens={tokens} />
          )}
        </div>
      </div>
    </div>
  );
}

function FriendCard({ user, actions = [], tokens }) {
  if (!user) return null;
  const av = user.avatarColor || "#9b0028";
  const avA = user.avatarAccent || "#ff6080";
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(14px)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: user.avatarImage ? `url(${user.avatarImage}) center/cover no-repeat` : `linear-gradient(135deg, ${avA}, ${av})`, border: `1px solid ${tokens.border}` }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, color: tokens.textStrong, letterSpacing: "-0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
          <div style={{ color: tokens.textMuted, fontSize: 12 }}>@{user.handle}</div>
        </div>
      </div>
      <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 12, lineHeight: 1.5 }}>
        {user.program} · {user.year} · {user.college}
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {actions.map((a) => (
          <button key={a.label} onClick={a.onClick} style={btn(a.kind, tokens)}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}

function Empty({ text, tokens }) {
  return <div style={{ gridColumn: "1 / -1", color: tokens.textMuted, fontSize: 13 }}>{text}</div>;
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
