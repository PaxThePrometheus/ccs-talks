"use client";

import { defaultLandingCms } from "@/lib/ccs/landingDefaults";
import { useEffect, useRef, useState } from "react";
import * as api from "../api/ccsApi";
import { GSAP_CDN } from "../cdn";
import { APP_CONFIG } from "../config/appConfig";
import { useScript } from "../useScript";
import { PostCard } from "../components/PostCard";
import { MiniProfilePreview } from "../ui/MiniProfilePreview";
import { useAppState } from "../state/AppState";
import { PostDetailModal } from "../ui/PostDetailModal";

export function ForumScreen({ readOnly = false, onSignInPrompt }) {
  const { users, posts, likePost, toggleBookmark, sharePost, reportPost, tokens, prefs, setPage, publishPost } = useAppState();
  const isLight = prefs.mode === "light";
  const [forumRail, setForumRail] = useState(() => defaultLandingCms().forumRail);
  const [draft, setDraft] = useState("");
  const composeRef = useRef(null);
  const feedScrollRef = useRef(null);
  const gsapLoaded = useScript(GSAP_CDN);
  const [loadingMore, setLoadingMore] = useState(false);
  const [caughtUp, setCaughtUp] = useState(false);
  const [preview, setPreview] = useState(null);
  const closeTimerRef = useRef(null);
  const [activePostId, setActivePostId] = useState(null);
  const [activeTag, setActiveTag] = useState("All");

  /** Forum rail copy is CMS-driven; poll so admin edits converge without redeploying. */
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const d = await api.getLanding();
        if (!alive || !d?.cms?.forumRail) return;
        setForumRail((prev) => ({
          rising: Array.isArray(d.cms.forumRail.rising) ? d.cms.forumRail.rising : prev.rising,
          interests: Array.isArray(d.cms.forumRail.interests) ? d.cms.forumRail.interests : prev.interests,
          trending: Array.isArray(d.cms.forumRail.trending) ? d.cms.forumRail.trending : prev.trending,
        }));
      } catch {
        /* keep last good rail */
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 15_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !composeRef.current) return undefined;
    if (gsapLoaded && window.gsap && !prefs.reduceMotion) {
      window.gsap.fromTo(composeRef.current, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
      return undefined;
    }
    composeRef.current.style.opacity = "1";
    const id = setTimeout(() => {
      if (composeRef.current) composeRef.current.style.opacity = "1";
    }, 1200);
    return () => clearTimeout(id);
  }, [gsapLoaded, prefs.reduceMotion]);

  const handlePublish = async () => {
    if (readOnly) {
      onSignInPrompt?.();
      return;
    }
    if (!draft.trim()) return;
    try {
      await publishPost(draft.trim(), prefs.defaultPostTag || "General");
      setDraft("");
    } catch {
      // Network / validation — keep draft so the user doesn’t lose it.
    }
  };

  const handleAuthorEnter = (userId, rect) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPreview({ userId, rect });
  };
  const handleAuthorLeave = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setPreview(null), 180);
  };

  const handlePreviewEnter = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const handlePreviewLeave = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setPreview(null), 120);
  };

  const onFeedScroll = () => {
    const el = feedScrollRef.current;
    if (!el || loadingMore || caughtUp) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (!nearBottom) return;
    setLoadingMore(true);
    window.setTimeout(() => {
      setLoadingMore(false);
      setCaughtUp(true);
    }, 900);
  };

  const Panel = ({ title, children }) => (
    <div style={{ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}`, borderRadius: 14, backdropFilter: "blur(10px)", overflow: "hidden", boxShadow: isLight ? "0 10px 24px rgba(60,0,20,0.08)" : "0 14px 40px rgba(0,0,0,0.25)" }}>
      <div style={{ background: isLight ? "rgba(255,224,232,0.85)" : "rgba(160,0,40,0.45)", padding: "10px 16px", fontWeight: 800, fontSize: 13, color: isLight ? "#3a0014" : "#ffd2d8", letterSpacing: "-0.1px" }}>{title}</div>
      {children}
    </div>
  );

  const PanelRow = ({ children, onClick }) => (
    <div
      onClick={onClick}
      style={{
        padding: "10px 16px",
        borderTop: `1px solid ${tokens.divider}`,
        color: tokens.textMuted,
        fontSize: 13,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = isLight ? "rgba(60,0,20,0.05)" : "rgba(120,0,30,0.30)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </div>
  );

  return (
    <>
      {/* Center feed (ONLY this scrolls). Left/right offsets come from CSS
          variables so the feed expands to full width on small viewports. */}
      <div
        ref={feedScrollRef}
        onScroll={onFeedScroll}
        className="ccs-scroll"
        style={{
          position: "fixed",
          top: 0,
          left: "var(--ccs-shell-left)",
          right: "var(--ccs-rail-right)",
          bottom: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "1.75rem var(--ccs-shell-pad-x) 2.5rem",
          borderLeft: `1px solid ${tokens.divider}`,
          borderRight: `1px solid ${tokens.divider}`,
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {readOnly && (
            <div
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                borderRadius: 14,
                border: `1px solid ${tokens.cardBorder}`,
                background: tokens.cardBg,
                backdropFilter: "blur(12px)",
                color: tokens.text,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 900, color: tokens.textStrong }}>You're browsing as a guest.</div>
                <div style={{ color: tokens.textMuted, marginTop: 2 }}>Sign in to post, like, bookmark, or comment.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPage("login")} style={btn(tokens, "solid")}>Sign in</button>
                <button onClick={() => setPage("register")} style={btn(tokens, "ghost")}>Create account</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {["All", "General", "Academics", "Tech", "Events"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                style={{
                  border: `1px solid ${tokens.border}`,
                  background: activeTag === t ? (isLight ? "rgba(60,0,20,0.10)" : "rgba(255,255,255,0.10)") : tokens.surfaceAlt,
                  color: tokens.text,
                  padding: "7px 10px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div
            ref={composeRef}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: tokens.cardBg,
              border: `1px solid ${tokens.cardBorder}`,
              borderRadius: 18,
              padding: "12px 14px",
              marginBottom: "1.2rem",
              backdropFilter: "blur(12px)",
              opacity: 0,
              boxShadow: isLight ? "0 12px 24px rgba(60,0,20,0.08)" : "0 18px 60px rgba(0,0,0,0.30)",
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={readOnly ? "Sign in to start posting…" : APP_CONFIG.placeholders.composer}
              disabled={readOnly}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: tokens.text,
                fontSize: 14,
                opacity: readOnly ? 0.6 : 1,
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePublish()}
            />
            <button
              onClick={handlePublish}
              style={{
                background: "linear-gradient(135deg, #c0002a, #8b0020)",
                border: "none",
                color: "#fff",
                padding: "9px 18px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              {readOnly ? "Sign in" : "Publish"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {posts
              .filter((p) => activeTag === "All" || p.tag === activeTag)
              .slice(0, readOnly ? 3 : posts.length) // limited preview
              .map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  user={users[post.userId]}
                  readOnly={readOnly}
                  onLike={readOnly ? onSignInPrompt : likePost}
                  onBookmark={readOnly ? onSignInPrompt : toggleBookmark}
                  onAuthorEnter={handleAuthorEnter}
                  onAuthorLeave={handleAuthorLeave}
                  onOpenComments={(id) => setActivePostId(id)}
                  onShare={readOnly ? onSignInPrompt : sharePost}
                  onReport={readOnly ? onSignInPrompt : (id) => reportPost(id, "Reported from feed")}
                />
              ))}
          </div>

          {readOnly && (
            <div
              style={{
                marginTop: "1.25rem",
                padding: "16px",
                borderRadius: 14,
                border: `1px dashed ${tokens.borderStrong}`,
                background: tokens.cardBg,
                color: tokens.text,
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 900, color: tokens.textStrong }}>Want to see the rest?</div>
              <div style={{ color: tokens.textMuted, fontSize: 13, marginTop: 4 }}>Sign in to view {posts.length - 3}+ more threads, comments, and join the conversation.</div>
              <div style={{ marginTop: 10, display: "inline-flex", gap: 8 }}>
                <button onClick={() => setPage("login")} style={btn(tokens, "solid")}>Sign in</button>
                <button onClick={() => setPage("register")} style={btn(tokens, "ghost")}>Create account</button>
              </div>
            </div>
          )}

          {/* Inline rails — only visible on small screens (the floating right
              rail below is hidden by CSS at the same breakpoint). */}
          <div className="ccs-hide-tablet" style={{ display: "none" }} />
          <div style={{ marginTop: "1.5rem" }} className="ccs-rail-inline">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Panel title="Rising Threads">
                {forumRail.rising.map((t, i) => (
                  <PanelRow key={i} onClick={() => setPage("search")}>{t}</PanelRow>
                ))}
              </Panel>
              <Panel title="Trending">
                {forumRail.trending.map((t, i) => (
                  <PanelRow key={i} onClick={() => setPage("search")}>{t}</PanelRow>
                ))}
              </Panel>
              <button onClick={() => setPage("search")} style={{ ...btn(tokens, "ghost") }}>
                🔎 Open Search
              </button>
            </div>
          </div>

          {!readOnly && (loadingMore || caughtUp) && (
            <div style={{ marginTop: "1.25rem" }}>
              {loadingMore && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: 140,
                        borderRadius: 18,
                        border: `1px solid ${tokens.cardBorder}`,
                        background: tokens.surfaceAlt,
                        backdropFilter: "blur(10px)",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ height: "100%", background: "linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.10), rgba(255,255,255,0.03))", backgroundSize: "300% 100%", animation: "ccsShimmer 1.2s ease-in-out infinite" }} />
                    </div>
                  ))}
                </div>
              )}
              {caughtUp && !loadingMore && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: `1px solid ${tokens.cardBorder}`,
                    background: tokens.cardBg,
                    backdropFilter: "blur(12px)",
                    color: tokens.textMuted,
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  You're all caught up.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right rail (fixed). Hidden at tablet/mobile breakpoints — the same
          panels are rendered inline above. */}
      <div
        className="ccs-hide-tablet"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          padding: "1.75rem 1.5rem 2rem",
          overflow: "hidden",
        }}
      >
        <div style={{ height: "100%", overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <Panel title="Rising Threads">
              {forumRail.rising.map((t, i) => (
                <PanelRow key={i} onClick={() => setPage("search")}>{t}</PanelRow>
              ))}
            </Panel>
            <Panel title="From your interests">
              {forumRail.interests.map((t, i) => (
                <PanelRow key={i} onClick={() => setPage("search")}>{t}</PanelRow>
              ))}
            </Panel>
            <Panel title="Trending">
              {forumRail.trending.map((t, i) => (
                <PanelRow key={i} onClick={() => setPage("search")}>{t}</PanelRow>
              ))}
            </Panel>
            <button onClick={() => setPage("search")} style={{ ...btn(tokens, "ghost"), marginTop: 4 }}>
              🔎 Open Search
            </button>
          </div>
        </div>
      </div>

      <MiniProfilePreview
        visible={!!preview}
        user={preview ? users[preview.userId] : null}
        anchorRect={preview?.rect}
        onMouseEnter={handlePreviewEnter}
        onMouseLeave={handlePreviewLeave}
        onRequestClose={() => setPreview(null)}
      />

      {!readOnly && <PostDetailModal open={activePostId != null} postId={activePostId} onClose={() => setActivePostId(null)} />}
    </>
  );
}

function btn(tokens, kind) {
  if (kind === "solid") {
    return {
      border: `1px solid ${tokens.borderStrong}`,
      background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.65))",
      color: "#fff",
      padding: "9px 12px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 850,
      fontSize: 13,
    };
  }
  return {
    border: `1px solid ${tokens.border}`,
    background: tokens.surface,
    color: tokens.text,
    padding: "9px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 750,
    fontSize: 13,
    backdropFilter: "blur(8px)",
  };
}
