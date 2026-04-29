"use client";

import { APP_CONFIG } from "../config/appConfig";
import { useAppState } from "../state/AppState";

export function ActivitiesScreen() {
  const { activities, posts, users, tokens } = useAppState();
  const getPost = (id) => posts.find((p) => p.id === id);

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
        <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", fontSize: 18 }}>{APP_CONFIG.routes.activities.title}</div>
        <div style={{ color: tokens.textMuted, fontSize: 13, marginTop: 2 }}>Your recent actions across CCS Talks.</div>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {activities.map((a) => {
            const p = a.postId ? getPost(a.postId) : null;
            const u = a.userId ? users[a.userId] : null;
            return (
              <div key={a.id} style={{ borderRadius: 18, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(14px)", padding: 14 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900, color: tokens.textStrong }}>{labelFor(a.type)}</div>
                  <div style={{ color: tokens.textMuted, fontSize: 12 }}>{u ? `@${u.handle}` : ""}</div>
                  <div style={{ marginLeft: "auto", color: tokens.textSubtle, fontSize: 12 }}>{new Date(a.ts).toLocaleString()}</div>
                </div>
                {p && (
                  <div style={{ marginTop: 8, color: tokens.text, fontSize: 13, lineHeight: 1.6 }}>
                    {p.content.length > 160 ? p.content.slice(0, 160) + "…" : p.content}
                  </div>
                )}
                {a.reason && <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 12 }}>Reason: {a.reason}</div>}
              </div>
            );
          })}
          {activities.length === 0 && <div style={{ marginTop: 16, color: tokens.textMuted, fontSize: 13 }}>No activity yet.</div>}
        </div>
      </div>
    </div>
  );
}

function labelFor(t) {
  if (t === "like") return "Liked a post";
  if (t === "bookmark") return "Bookmarked a post";
  if (t === "share") return "Shared a post";
  if (t === "report") return "Reported content";
  if (t === "comment") return "Commented";
  if (t === "edit_post") return "Edited a post";
  if (t === "friend_accept") return "Accepted a friend";
  if (t === "friend_decline") return "Declined a friend request";
  if (t === "friend_remove") return "Removed a friend";
  if (t === "friend_request") return "Sent a friend request";
  if (t === "mod_delete_post") return "Mod: deleted a post";
  if (t === "mod_ban") return "Mod: banned a user";
  if (t === "mod_unban") return "Mod: unbanned a user";
  return t || "Activity";
}
