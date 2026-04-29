"use client";

import { useEffect, useRef } from "react";
import { GSAP_CDN } from "../cdn";
import { THEME } from "../theme";
import { useScript } from "../useScript";

export function PostCard({ post, onLike, onBookmark }) {
  const cardRef = useRef(null);
  const gsapLoaded = useScript(GSAP_CDN);

  useEffect(() => {
    if (!gsapLoaded || typeof window === "undefined" || !window.gsap || !cardRef.current) return;
    window.gsap.fromTo(cardRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: post.id * 0.07 });
  }, [gsapLoaded, post.id]);

  const tagColor = { General: "#7a4060", Academics: "#405080", Tech: "#205040", Events: "#7a2020" };

  return (
    <div
      ref={cardRef}
      style={{
        background: THEME.colors.cardBg,
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 18,
        backdropFilter: "blur(10px)",
        opacity: 0,
        transition: "border-color 0.2s, transform 0.15s",
        boxShadow: "0 16px 50px rgba(0,0,0,0.30)",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ padding: "1.05rem 1.2rem", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #9b0028, #50001a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
            color: "#ffcccc",
            flexShrink: 0,
          }}
        >
          {post.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#f0e0e0" }}>{post.author}</span>
            <span style={{ color: "rgba(240,200,200,0.45)", fontSize: 13 }}>@{post.handle}</span>
            <span style={{ color: "rgba(240,200,200,0.35)", fontSize: 12, marginLeft: "auto" }}>{post.time}</span>
          </div>
          <span
            style={{
              background: tagColor[post.tag] || "#503040",
              color: "rgba(255,220,220,0.9)",
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 20,
              fontWeight: 600,
              marginTop: 2,
              display: "inline-block",
            }}
          >
            {post.tag}
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

      <div style={{ padding: "0.95rem 1.2rem 1rem" }}>
        <p style={{ color: "rgba(240,220,220,0.9)", fontSize: 15, lineHeight: 1.65, margin: 0 }}>{post.content}</p>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

      <div style={{ padding: "0.65rem 0.85rem", display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={() => onLike(post.id)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(240,180,180,0.7)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            padding: "8px 10px",
            borderRadius: 10,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ff6080")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,180,180,0.7)")}
        >
          ♥ {post.likes}
        </button>
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.10)" }} />
        <button
          style={{
            background: "none",
            border: "none",
            color: "rgba(240,180,180,0.7)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            padding: "8px 10px",
            borderRadius: 10,
          }}
        >
          💬 {post.comments}
        </button>
        <button
          onClick={() => onBookmark(post.id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            marginLeft: "auto",
            color: post.bookmarked ? "#ff8060" : "rgba(240,180,180,0.5)",
            fontSize: 16,
            padding: "8px 10px",
            lineHeight: 1,
            transition: "color 0.2s",
            borderRadius: 10,
          }}
        >
          🔖
        </button>
      </div>
    </div>
  );
}

