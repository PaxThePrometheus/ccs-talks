"use client";

import { useMemo } from "react";
import { APP_CONFIG } from "../config/appConfig";
import { useAppState } from "../state/AppState";
import { PostCard } from "../components/PostCard";

function passesReportVisibility(post, prefs, bypass) {
  if (bypass) return true;
  const thresh = Number(prefs.hideReportedAfter);
  const c = Number(post?.openReportCount ?? 0);
  return !Number.isFinite(thresh) || c < thresh;
}

export function BookmarksScreen() {
  const {
    posts,
    users,
    likePost,
    toggleBookmark,
    sharePost,
    reportPost,
    tokens,
    openPost,
    prefs,
    isStaff,
    profile,
    pinPost,
    deletePost,
    banUser,
  } = useAppState();
  const bookmarked = useMemo(
    () => posts.filter((p) => p.bookmarked && passesReportVisibility(p, prefs, isStaff)),
    [posts, prefs, isStaff],
  );

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
              onOpenComments={(id) => openPost(id)}
              onShare={sharePost}
              onReport={(id) => void reportPost(id, "Reported from bookmarks")}
              staffModeration={
                isStaff
                  ? {
                      pinned: !!post.pinned,
                      onTogglePin: () => void pinPost(post.id),
                      onDeletePost: () => {
                        if (typeof window !== "undefined" && !window.confirm("Delete this post for everyone?"))
                          return;
                        void deletePost(post.id);
                      },
                      onBanAuthor:
                        post.userId &&
                        profile?.id &&
                        String(post.userId) !== String(profile.id)
                          ? () => {
                              if (typeof window !== "undefined" && !window.confirm("Ban this author?")) return;
                              void banUser(post.userId);
                            }
                          : undefined,
                    }
                  : undefined
              }
            />
          ))}
          {bookmarked.length === 0 && <div style={{ marginTop: 16, color: tokens.textMuted, fontSize: 13 }}>No bookmarks yet.</div>}
        </div>
      </div>
    </div>
  );
}
