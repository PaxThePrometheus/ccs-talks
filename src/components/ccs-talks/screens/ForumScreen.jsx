"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GSAP_CDN } from "../cdn";
import { INTERESTS, MOCK_POSTS, RISING, TRENDING } from "../data";
import { THEME } from "../theme";
import { useScript } from "../useScript";
import { PostCard } from "../components/PostCard";

export function ForumScreen() {
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [draft, setDraft] = useState("");
  const composeRef = useRef(null);
  const feedScrollRef = useRef(null);
  const gsapLoaded = useScript(GSAP_CDN);
  const [loadingMore, setLoadingMore] = useState(false);
  const [caughtUp, setCaughtUp] = useState(false);

  useEffect(() => {
    if (!gsapLoaded || typeof window === "undefined" || !window.gsap || !composeRef.current) return;
    window.gsap.fromTo(composeRef.current, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
  }, [gsapLoaded]);

  const handleLike = useCallback((id) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)));
  }, []);

  const handleBookmark = useCallback((id) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, bookmarked: !p.bookmarked } : p)));
  }, []);

  const handlePublish = () => {
    if (!draft.trim()) return;
    const newPost = {
      id: Date.now(),
      author: "You",
      handle: "you",
      avatar: "ME",
      time: "Just now",
      content: draft,
      likes: 0,
      comments: 0,
      bookmarked: false,
      tag: "General",
    };
    setPosts((ps) => [newPost, ...ps]);
    setDraft("");
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
    <div style={{ background: THEME.colors.cardBg, border: `1px solid ${THEME.colors.cardBorder}`, borderRadius: 14, backdropFilter: "blur(10px)", overflow: "hidden", boxShadow: "0 14px 40px rgba(0,0,0,0.25)" }}>
      <div style={{ background: "rgba(160,0,40,0.65)", padding: "10px 16px", fontWeight: 700, fontSize: 13, color: "#ffcccc" }}>{title}</div>
      {children}
    </div>
  );

  const PanelRow = ({ children }) => (
    <div
      style={{
        padding: "10px 16px",
        borderTop: `1px solid ${THEME.colors.cardBorder}`,
        color: "rgba(240,200,200,0.75)",
        fontSize: 13,
        cursor: "pointer",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(120,0,30,0.3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </div>
  );

  return (
    <>
      {/* Center feed (ONLY this scrolls) */}
      <div
        ref={feedScrollRef}
        onScroll={onFeedScroll}
        style={{
          position: "fixed",
          top: 0,
          left: 280,
          right: 320,
          bottom: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "1.75rem 2rem 2.5rem",
          borderLeft: `1px solid ${THEME.colors.divider}`,
          borderRight: `1px solid ${THEME.colors.divider}`,
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div
            ref={composeRef}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: THEME.colors.cardBg,
              border: `1px solid rgba(255,255,255,0.10)`,
              borderRadius: 18,
              padding: "12px 14px",
              marginBottom: "1.2rem",
              backdropFilter: "blur(12px)",
              opacity: 0,
              boxShadow: "0 18px 60px rgba(0,0,0,0.30)",
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What's on your mind?"
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "#f0e0e0",
                fontSize: 14,
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
                fontWeight: 700,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "opacity 0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Publish
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onLike={handleLike} onBookmark={handleBookmark} />
            ))}
          </div>

          {(loadingMore || caughtUp) && (
            <div style={{ marginTop: "1.25rem" }}>
              {loadingMore && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: 140,
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(80,0,26,0.40)",
                        backdropFilter: "blur(10px)",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ height: "100%", background: "linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.07), rgba(255,255,255,0.03))", backgroundSize: "300% 100%", animation: "ccsShimmer 1.2s ease-in-out infinite" }} />
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
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(30,0,12,0.55)",
                    backdropFilter: "blur(12px)",
                    color: "rgba(240,220,220,0.75)",
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  You’re all caught up.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right rail (fixed) */}
      <div
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
            <div style={{ background: THEME.colors.cardBg, border: `1px solid rgba(255,255,255,0.10)`, borderRadius: 14, padding: "10px 14px", backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ opacity: 0.75 }}>🔎</span>
                <input
                  placeholder="Search..."
                  style={{
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "#f0e0e0",
                    fontSize: 13,
                    width: "100%",
                  }}
                />
              </div>
            </div>

            <Panel title="Rising Threads">
              {RISING.map((t, i) => (
                <PanelRow key={i}>{t}</PanelRow>
              ))}
            </Panel>
            <Panel title="From your interests">
              {INTERESTS.map((t, i) => (
                <PanelRow key={i}>{t}</PanelRow>
              ))}
            </Panel>
            <Panel title="Trending">
              {TRENDING.map((t, i) => (
                <PanelRow key={i}>{t}</PanelRow>
              ))}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

