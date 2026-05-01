"use client";

import { truncateForFeedPreview } from "@/lib/ccs/postContentLimits";
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
import { badgeAccentForLabel, badgePillColors } from "@/lib/ccs/badgeColors";

/**
 * Staff-only moderation affordances (`/api/admin/*`, same cookie as moderator).
 * @typedef {{ pinned?: boolean; onTogglePin?: () => void | Promise<void>; onDeletePost?: () => void | Promise<void>; onBanAuthor?: () => void | Promise<void> }} StaffModerationOpts
 */

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
  /** @type {StaffModerationOpts | undefined} */
  staffModeration,
  readOnly = false,
  isOnline = false,
}) {
  const cardRef = useRef(null);
  const [imageViewer, setImageViewer] = useState(null);
  const gsapLoaded = useScript(GSAP_CDN, { expectGlobal: "gsap" });
  const { tokens, prefs, users, visitUserProfile, tagColors } = useAppState();
  const [staffMenuOpen, setStaffMenuOpen] = useState(false);
  const isLight = prefs.mode === "light";
  const calmMotion = !!(prefs.reduceMotion || prefs.reduceEffects);
  const liftHover = !(prefs.reduceMotion || prefs.reduceEffects);
  const handleDir = useMemo(() => buildHandleDirectory(users), [users]);

  const { text: previewMarkdown, truncated } = useMemo(() => truncateForFeedPreview(post.content), [post.content]);

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

  const tagAccent = badgeAccentForLabel(tagColors || {}, post.tag);
  const tagPill = badgePillColors(tagAccent, isLight, tokens);
  const displayName = user?.name ?? "Unknown";
  const handle = user?.handle ?? "unknown";
  const avColor = user?.avatarColor || (isLight ? "#c0002a" : "#9b0028");
  const avAccent = user?.avatarAccent || (isLight ? "#ff6080" : "#50001a");

  // Avatar can be either a color gradient or a real image
  const hasImg = !!user?.avatarImage;

  const muted = isLight ? "rgba(60,0,20,0.55)" : "rgba(240,180,180,0.7)";
  const subtle = isLight ? "rgba(60,0,20,0.40)" : "rgba(240,180,180,0.55)";
  const dividerColor = isLight ? "rgba(60,0,20,0.10)" : "rgba(255,255,255,0.07)";

  const openAuthorProfile = () => {
    if (!post?.userId) return;
    visitUserProfile(post.userId);
  };

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
        <button
          type="button"
          aria-label={`View ${displayName}'s profile`}
          onClick={openAuthorProfile}
          onMouseEnter={(e) => {
            if (!onAuthorEnter) return;
            const r = e.currentTarget.getBoundingClientRect();
            onAuthorEnter(post.userId, r);
          }}
          onMouseLeave={() => onAuthorLeave?.()}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            font: "inherit",
            textAlign: "left",
            color: "inherit",
            borderRadius: 12,
          }}
        >
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: tokens.textStrong }}>{displayName}</span>
              <UserStatusBadgeRow user={user} tokens={tokens} isLight={isLight} dense gap={6} />
              <span style={{ color: subtle, fontSize: 13 }}>@{handle}</span>
            </div>
            <span
              style={{
                background: tagPill.background,
                color: tagPill.color,
                border: `1px solid ${tagPill.border}`,
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
        </button>
        <span style={{ color: subtle, fontSize: 12, flexShrink: 0, lineHeight: "40px" }}>{post.time}</span>
      </div>

      <div style={{ height: 1, background: dividerColor }} />

      {/* Click body (except inline http links / mentions) opens full thread. Preview length capped in `truncateForFeedPreview`. */}
      <div
        className="ccs-post-body-hit"
        role={onOpenComments ? "button" : undefined}
        tabIndex={onOpenComments ? 0 : undefined}
        aria-label={
          onOpenComments
            ? `${truncated ? "Preview · " : ""}Open thread${typeof post.comments === "number" ? `, ${post.comments} comments` : ""}`
            : undefined
        }
        title={truncated ? "Click to open full post and comments" : onOpenComments ? "Open thread" : undefined}
        onKeyDown={(ev) => {
          if (!onOpenComments) return;
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            onOpenComments(post.id);
          }
        }}
        onClick={(ev) => {
          if (!onOpenComments) return;
          if (ev.target.closest("a[href]")) return;
          onOpenComments(post.id);
        }}
        onMouseEnter={(e) => {
          if (!onOpenComments) return;
          e.currentTarget.style.background = isLight ? "rgba(60,0,20,0.035)" : "rgba(255,255,255,0.045)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        style={{
          padding: "0.95rem 1.2rem 1rem",
          cursor: onOpenComments ? "pointer" : undefined,
          transition: "background 0.15s ease",
        }}
      >
        <div style={{ fontSize: 15, margin: 0, pointerEvents: "auto" }}>
          <CcsMarkdown
            source={previewMarkdown}
            accentColor={tokens.accent}
            handleToUserId={handleDir}
            onVisitUser={readOnly ? undefined : visitUserProfile}
            tokens={tokens}
          />
        </div>
        {truncated ? (
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, letterSpacing: "0.01em", color: tokens.accent }}>
            Tap to expand · {typeof post.comments === "number" ? `${post.comments} comment${post.comments === 1 ? "" : "s"}` : "comments"}
          </div>
        ) : null}
      </div>

      {post.imageUrl ? (
        <div style={{ padding: "0 1.2rem 1rem", marginTop: 6 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setImageViewer({
                src: post.imageUrl,
                title: post.content?.trim().slice(0, 48) || "Post",
              });
            }}
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

      <div style={{ height: 1, background: dividerColor }} />

      <div
        style={{ padding: "0.65rem 0.85rem", display: "flex", gap: 10, alignItems: "center", position: "relative" }}
        onClick={(e) => {
          /** Don’t propagate into post body expand / overlay handlers. */
          e.stopPropagation();
        }}
      >
        <ActionBtn disabled={readOnly} onClick={() => !readOnly && onLike?.(post.id)} muted={muted} hover="#ff6080">
          <Icon name="heart" size={15} /> {post.likes}
        </ActionBtn>
        <Sep color={dividerColor} />
        <ActionBtn onClick={() => onOpenComments?.(post.id)} muted={muted}>
          <Icon name="comment" size={15} /> {post.comments}
        </ActionBtn>
        <Sep color={dividerColor} />
        <ActionBtn onClick={() => onShare?.(post.id)} muted={muted}>
          <Icon name="share" size={15} /> Share
        </ActionBtn>
        <ActionBtn disabled={readOnly} onClick={() => !readOnly && onReport?.(post.id)} muted={subtle}>
          <Icon name="flag" size={15} /> Report
        </ActionBtn>

        {staffModeration?.onTogglePin || staffModeration?.onDeletePost || staffModeration?.onBanAuthor ? (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStaffMenuOpen((v) => !v);
              }}
              style={{
                background: readOnly ? "transparent" : isLight ? "rgba(180,120,140,0.12)" : "rgba(255,96,128,0.14)",
                border: `1px solid ${dividerColor}`,
                color: muted,
                cursor: readOnly ? "not-allowed" : "pointer",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 800,
              }}
              title="Staff moderation"
              disabled={readOnly}
            >
              Shield
            </button>
            {staffMenuOpen && !readOnly && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  marginBottom: 8,
                  minWidth: 160,
                  borderRadius: 12,
                  border: `1px solid ${tokens.borderStrong}`,
                  background: tokens.cardBg,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
                  overflow: "hidden",
                  zIndex: 40,
                }}
              >
                {staffModeration.onTogglePin ? (
                  <StaffMenuBtn
                    label={staffModeration.pinned ? "Unpin" : "Pin"}
                    tokens={tokens}
                    onClick={() => {
                      setStaffMenuOpen(false);
                      void staffModeration.onTogglePin?.();
                    }}
                  />
                ) : null}
                {staffModeration.onDeletePost ? (
                  <StaffMenuBtn
                    label="Delete post"
                    tokens={tokens}
                    danger
                    onClick={() => {
                      setStaffMenuOpen(false);
                      void staffModeration.onDeletePost?.();
                    }}
                  />
                ) : null}
                {staffModeration.onBanAuthor ? (
                  <StaffMenuBtn
                    label="Ban author"
                    tokens={tokens}
                    danger
                    onClick={() => {
                      setStaffMenuOpen(false);
                      void staffModeration.onBanAuthor?.();
                    }}
                  />
                ) : null}
              </div>
            )}
          </div>
        ) : null}

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

function StaffMenuBtn({ label, onClick, tokens, danger }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "none",
        margin: 0,
        cursor: "pointer",
        padding: "10px 12px",
        fontSize: 12,
        fontWeight: 800,
        background: tokens.surfaceAlt,
        color: danger ? "#ff6b8f" : tokens.text,
      }}
    >
      {label}
    </button>
  );
}
