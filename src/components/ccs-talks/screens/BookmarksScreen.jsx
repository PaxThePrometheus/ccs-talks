"use client";

import { APP_CONFIG } from "../config/appConfig";
import { useAppState } from "../state/AppState";
import { PostCard } from "../components/PostCard";

export function BookmarksScreen() {
  const { posts, users, likePost, toggleBookmark, sharePost, reportPost, tokens } = useAppState();
  const bookmarked = posts.filter((p) => p.bookmarked);

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
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", fontSize: 18 }}>{APP_CONFIG.routes.bookmarks.title}</div>
        <div style={{ color: tokens.textMuted, fontSize: 13, marginTop: 2 }}>Threads you've saved for later.</div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {bookmarked.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={users[post.userId]}
              onLike={likePost}
              onBookmark={toggleBookmark}
              onShare={sharePost}
              onReport={(id) => reportPost(id, "Reported from bookmarks")}
            />
          ))}
          {bookmarked.length === 0 && <div style={{ marginTop: 16, color: tokens.textMuted, fontSize: 13 }}>No bookmarks yet.</div>}
        </div>
      </div>
    </div>
  );
}
