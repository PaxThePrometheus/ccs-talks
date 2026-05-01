"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GSAP_CDN } from "../cdn";
import { useScript } from "../useScript";
import { useAppState } from "../state/AppState";
import { Icon } from "../ui/Icon";
import { CcsMarkdown } from "./CcsMarkdown";
import { buildHandleDirectory } from "./MentionBody";
import { SignatureFooter } from "./SignatureFooter";
import { ForumImageLightbox } from "../ui/ForumImageLightbox";
import { UserStatusBadgeRow } from "../ui/UserStatusBadgeRow";

export function PostCard({
  post,
  user,
  onLike,
  onBookmark,
  onAuthorEnter,
  onAuthorLeave,
  onOpenComments,
  onShare,
  onReport,
  readOnly = false,
}) {
  const cardRef = useRef(null);
  const [imageViewer, setImageViewer] = useState(null);
  const gsapLoaded = useScript(GSAP_CDN, { expectGlobal: "gsap" });
  const { tokens, prefs, users, visitUserProfile } = useAppState();
  const isLight = prefs.mode === "light";
  const calmMotion = !!(prefs.reduceMotion || prefs.reduceEffects);
  const liftHover = !(prefs.reduceMotion || prefs.reduceEffects);
  const handleDir = useMemo(() => buildHandleDirectory(users), [users]);

  useEffect(() => {
    if (typeof window === "undefined" || !cardRef.current) return undefined;
    if (gsapLoaded && window.gsap && !calmMotion) {
      // Apple-y bounce: small overshoot, kept short and tasteful.
      window.gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 22, scale: 0.965 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.6)" }
      );
      return undefined;
    }
    cardRef.current.style.opacity = "1";
    // Belt-and-braces: if gsap arrives later, also make sure we end up visible.
    const id = setTimeout(() => {
      if (cardRef.current) cardRef.current.style.opacity = "1";
    }, 1200);
    return () => clearTimeout(id);
  }, [gsapLoaded, post.id, calmMotion]);

  const tagColor = isLight
    ? { General: "#e9d4dd", Academics: "#d6e0f0", Tech: "#d4ece3", Events: "#f0d6d6" }
    : { General: "#7a4060", Academics: "#405080", Tech: "#205040", Events: "#7a2020" };
  const tagText = isLight ? "#3a0014" : "rgba(255,220,220,0.9)";
  const displayName = user?.name ?? "Unknown";
  const handle = user?.handle ?? "unknown";
  const avColor = user?.avatarColor || (isLight ? "#c0002a" : "#9b0028");
  const avAccent = user?.avatarAccent || (isLight ? "#ff6080" : "#50001a");

  // Avatar can be either a color gradient or a real image
  const hasImg = !!user?.avatarImage;

  const muted = isLight ? "rgba(60,0,20,0.55)" : "rgba(240,180,180,0.7)";
  const subtle = isLight ? "rgba(60,0,20,0.40)" : "rgba(240,180,180,0.55)";
  const dividerColor = isLight ? "rgba(60,0,20,0.10)" : "rgba(255,255,255,0.07)";

  return (
    <div
      ref={cardRef}
      data-anim="card"
      style={{
        background: tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: 18,
        backdropFilter: "blur(10px)",
        opacity: 0,
        transition: "border-color 0.2s, transform 0.15s",
        boxShadow: isLight ? "0 12px 28px rgba(60,0,20,0.10)" : "0 16px 50px rgba(0,0,0,0.30)",
        overflow: "hidden",
        color: tokens.text,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tokens.borderStrong;
        if (liftHover) e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = tokens.cardBorder;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ padding: "1.05rem 1.2rem", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: hasImg
              ? `url(${user.avatarImage}) center/cover no-repeat`
              : `linear-gradient(135deg, ${avColor}, ${avAccent})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
            color: "#ffe4ea",
            flexShrink: 0,
            border: `1px solid ${tokens.border}`,
          }}
        >
          {!hasImg && post.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{ fontWeight: 700, fontSize: 14, color: tokens.textStrong, cursor: "default" }}
              onMouseEnter={(e) => {
                if (!onAuthorEnter) return;
                const r = e.currentTarget.getBoundingClientRect();
                onAuthorEnter(post.userId, r);
              }}
              onMouseLeave={() => onAuthorLeave?.()}
            >
              {displayName}
            </span>
            <UserStatusBadgeRow user={user} tokens={tokens} isLight={isLight} dense gap={6} />
            <span style={{ color: subtle, fontSize: 13 }}>@{handle}</span>
            <span style={{ color: subtle, fontSize: 12, marginLeft: "auto" }}>{post.time}</span>
          </div>
          <span
            style={{
              background: tagColor[post.tag] || (isLight ? "#e9d4dd" : "#503040"),
              color: tagText,
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 20,
              fontWeight: 700,
              marginTop: 2,
              display: "inline-block",
            }}
          >
            {post.tag}
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: dividerColor }} />

      <div style={{ padding: "0.95rem 1.2rem 1rem" }}>
        <div style={{ fontSize: 15, margin: 0 }}>
          <CcsMarkdown
            source={post.content}
            accentColor={tokens.accent}
            handleToUserId={handleDir}
            onVisitUser={readOnly ? undefined : visitUserProfile}
            tokens={tokens}
          />
        </div>
        {post.imageUrl ? (
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() =>
                setImageViewer({
                  src: post.imageUrl,
                  title: post.content?.trim().slice(0, 48) || "Post",
                })
              }
              title="View image"
              style={{
                padding: 0,
                margin: 0,
                border: "none",
                background: "transparent",
                cursor: "zoom-in",
                display: "block",
                maxWidth: "100%",
                borderRadius: 12,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- user content */}
              <img
                src={post.imageUrl}
                alt=""
                style={{
                  maxHeight: 360,
                  maxWidth: "100%",
                  borderRadius: 12,
                  objectFit: "contain",
                  border: `1px solid ${dividerColor}`,
                  display: "block",
                }}
              />
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ height: 1, background: dividerColor }} />

      <div style={{ padding: "0.65rem 0.85rem", display: "flex", gap: 10, alignItems: "center" }}>
        <ActionBtn disabled={readOnly} onClick={() => !readOnly && onLike?.(post.id)} muted={muted} hover="#ff6080">
          <Icon name="heart" size={15} /> {post.likes}
        </ActionBtn>
        <Sep color={dividerColor} />
        <ActionBtn onClick={() => onOpenComments?.(post.id)} muted={muted}>
          <Icon name="comment" size={15} /> {post.comments}
        </ActionBtn>
        <Sep color={dividerColor} />
        <ActionBtn disabled={readOnly} onClick={() => !readOnly && onShare?.(post.id)} muted={muted}>
          <Icon name="share" size={15} /> Share
        </ActionBtn>
        <ActionBtn disabled={readOnly} onClick={() => !readOnly && onReport?.(post.id)} muted={subtle}>
          <Icon name="flag" size={15} /> Report
        </ActionBtn>
        <button
          disabled={readOnly}
          onClick={() => !readOnly && onBookmark?.(post.id)}
          style={{
            background: "none",
            border: "none",
            cursor: readOnly ? "not-allowed" : "pointer",
            marginLeft: "auto",
            color: post.bookmarked ? "#ff8060" : subtle,
            fontSize: 16,
            padding: "8px 10px",
            lineHeight: 1,
            transition: "color 0.2s",
            borderRadius: 10,
            opacity: readOnly ? 0.55 : 1,
            display: "inline-flex",
            alignItems: "center",
          }}
          title={post.bookmarked ? "Remove bookmark" : "Bookmark"}
        >
          <Icon name="bookmark" size={18} />
        </button>
      </div>

      <div style={{ padding: "0 1.2rem 1rem" }}>
        <SignatureFooter user={user} tokens={tokens} isLight={isLight} />
      </div>

      <ForumImageLightbox
        open={!!imageViewer?.src}
        src={imageViewer?.src ?? ""}
        title={imageViewer?.title ?? "Image"}
        onClose={() => setImageViewer(null)}
      />
    </div>
  );
}

function ActionBtn({ children, onClick, disabled, muted, hover }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: muted,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        padding: "8px 10px",
        borderRadius: 10,
        transition: "color 0.15s",
        opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        if (hover && !disabled) e.currentTarget.style.color = hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = muted;
      }}
    >
      {children}
    </button>
  );
}

function Sep({ color }) {
  return <div style={{ width: 1, height: 18, background: color }} />;
}
