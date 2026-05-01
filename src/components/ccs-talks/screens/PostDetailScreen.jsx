"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { THEME } from "../theme";
import { useAppState } from "../state/AppState";
import { Icon } from "../ui/Icon";
import { CcsMarkdown } from "../components/CcsMarkdown";
import { buildHandleDirectory } from "../components/MentionBody";
import { SignatureFooter } from "../components/SignatureFooter";
import { FeedComposer } from "../ui/FeedComposer";
import { ForumImageLightbox } from "../ui/ForumImageLightbox";
import { UserStatusBadgeRow } from "../ui/UserStatusBadgeRow";

export function PostDetailScreen({ readOnly = false, onSignInPrompt }) {
  const {
    posts,
    users,
    commentsByPostId,
    addComment,
    updatePost,
    sharePost,
    shareComment,
    reportPost,
    profile,
    loadCommentsFromServer,
    prefs,
    tokens,
    visitUserProfile,
    setPage,
    activePostId,
    postNotFoundId,
    isAuthed,
  } = useAppState();

  const postId = activePostId;
  const isLight = prefs.mode === "light";
  const [commentText, setCommentText] = useState("");
  const [commentImage, setCommentImage] = useState("");
  const [replyParentId, setReplyParentId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [imageViewer, setImageViewer] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  const post = useMemo(() => (postId != null ? posts.find((p) => String(p.id) === String(postId)) : null), [posts, postId]);
  const user = post ? users[post.userId] : null;
  const rawComments = (postId != null && commentsByPostId[String(postId)]) || commentsByPostId[postId] || [];
  const canEdit = post && post.userId === profile.id;
  const handleDir = useMemo(() => buildHandleDirectory(users), [users]);

  const showNotFound = postId != null && postNotFoundId != null && String(postNotFoundId) === String(postId);
  const loadingPost = postId != null && !post && !showNotFound;

  useEffect(() => {
    if (postId == null) return undefined;
    void loadCommentsFromServer(postId);
    return undefined;
  }, [postId, loadCommentsFromServer]);

  const { roots, repliesByParent } = useMemo(() => {
    const roots = [];
    const repliesByParent = {};
    for (const c of rawComments) {
      const pid = c.parentId && String(c.parentId).trim();
      if (!pid) {
        roots.push(c);
      } else {
        if (!repliesByParent[pid]) repliesByParent[pid] = [];
        repliesByParent[pid].push(c);
      }
    }
    roots.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    for (const k of Object.keys(repliesByParent)) {
      repliesByParent[k].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    }
    return { roots, repliesByParent };
  }, [rawComments]);

  const scrollToCommentFromHash = useCallback(() => {
    if (typeof window === "undefined" || postId == null) return;
    const hash = window.location.hash || "";
    const m = /^#c-(.+)$/.exec(hash);
    if (!m) return;
    let cid = m[1];
    try {
      cid = decodeURIComponent(cid);
    } catch {
      /* keep */
    }
    cid = String(cid || "").trim();
    if (!cid) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`comment-${cid}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(cid);
        window.setTimeout(() => setHighlightId((h) => (h === cid ? null : h)), 1500);
      }
    });
  }, [postId]);

  useEffect(() => {
    if (loadingPost || showNotFound) return;
    scrollToCommentFromHash();
  }, [loadingPost, showNotFound, roots.length, rawComments.length, scrollToCommentFromHash]);

  useEffect(() => {
    const onHash = () => scrollToCommentFromHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [scrollToCommentFromHash]);

  const submitComment = (parentId = null) => {
    if (!post || readOnly) return;
    const v = (parentId ? replyText : commentText).trim();
    if (!v) return;
    addComment(post.id, { userId: profile.id, text: v, imageUrl: parentId ? replyImage : commentImage, parentId });
    if (parentId) {
      setReplyText("");
      setReplyImage("");
      setReplyParentId(null);
    } else {
      setCommentText("");
      setCommentImage("");
    }
  };

  const handleStartEdit = () => {
    if (!post) return;
    setEditing(true);
    setEditText(post.content);
  };

  const handleSaveEdit = () => {
    if (!post) return;
    updatePost(post.id, { content: editText });
    setEditing(false);
  };

  const viewerTitleBase = post?.content?.trim().slice(0, 48) || "Post";

  const shareForComment = useCallback((cid) => post && shareComment(post.id, cid), [post, shareComment]);

  return (
    <div
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setPage("forum")}
            style={{
              border: `1px solid ${tokens.border}`,
              background: tokens.surface,
              color: tokens.text,
              padding: "8px 12px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Forum
          </button>
        </div>

        {readOnly && (
          <div
            style={{
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: 14,
              border: `1px solid ${tokens.cardBorder}`,
              background: tokens.cardBg,
              color: tokens.text,
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 900, color: tokens.textStrong }}>Guest view</div>
            <div style={{ color: tokens.textMuted, marginTop: 2 }}>Sign in to comment, like, or bookmark.</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button type="button" onClick={() => onSignInPrompt?.()} style={ghostBtn(tokens)}>
                Sign in
              </button>
            </div>
          </div>
        )}

        {loadingPost && (
          <div style={{ padding: 40, textAlign: "center", color: tokens.textMuted, fontWeight: 700 }}>
            Loading post…
          </div>
        )}

        {showNotFound && (
          <div
            style={{
              padding: 32,
              borderRadius: 18,
              border: `1px solid ${tokens.cardBorder}`,
              background: tokens.cardBg,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 8 }}>📭</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: tokens.textStrong }}>Post not found</div>
            <div style={{ color: tokens.textMuted, marginTop: 8, fontSize: 14 }}>
              This link may be broken or the post was removed.
            </div>
            <button type="button" onClick={() => setPage("forum")} style={{ ...ghostBtn(tokens), marginTop: 18 }}>
              Back to forum
            </button>
          </div>
        )}

        {!loadingPost && !showNotFound && post && (
          <>
            <div
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                borderRadius: 18,
                border: `1px solid ${tokens.cardBorder}`,
                background: tokens.cardBg,
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                aria-label={`View ${user?.name ?? "Author"}'s profile`}
                onClick={() => visitUserProfile(post.userId)}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  minWidth: 0,
                  flex: "0 1 auto",
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
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    flexShrink: 0,
                    border: `1px solid ${tokens.border}`,
                    background: user?.avatarImage
                      ? `url(${user.avatarImage}) center/cover no-repeat`
                      : "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.60))",
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900, color: tokens.textStrong, letterSpacing: "-0.2px", lineHeight: 1.1 }}>{user?.name ?? "Unknown"}</div>
                    <UserStatusBadgeRow user={user} tokens={tokens} isLight={isLight} chromed={isLight ? undefined : "modalDark"} dense gap={6} />
                  </div>
                  <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, color: tokens.textMuted, fontSize: 12 }}>
                    <span>
                      @{user?.handle ?? "unknown"} · {post.time}
                    </span>
                  </div>
                </div>
              </button>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={() => sharePost(post.id)} style={actionBtnStyle(tokens)}>
                  <Icon name="share" size={14} style={{ marginRight: 6 }} />
                  Share
                </button>
                {!readOnly && (
                  <button type="button" onClick={() => reportPost(post.id, "Inappropriate content")} style={actionBtnStyle(tokens)}>
                    <Icon name="flag" size={14} style={{ marginRight: 6 }} />
                    Report
                  </button>
                )}
                {canEdit && !editing && (
                  <button type="button" onClick={handleStartEdit} style={actionBtnStyle(tokens)}>
                    <Icon name="pencil" size={14} style={{ marginRight: 6 }} />
                    Edit
                  </button>
                )}
                {editing && (
                  <button type="button" onClick={handleSaveEdit} style={actionBtnStyle(tokens, "solid")}>
                    Save
                  </button>
                )}
              </div>
            </div>

            <div style={{ borderRadius: 16, border: `1px solid ${tokens.cardBorder}`, background: THEME.colors.cardBg, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "12px 14px" }}>
                {editing ? (
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} style={inputStyle(tokens, true)} />
                ) : (
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: tokens.text }}>
                    <CcsMarkdown
                      source={post.content}
                      accentColor="#ff9ab0"
                      handleToUserId={handleDir}
                      onVisitUser={visitUserProfile}
                      tokens={{
                        accent: tokens.accent,
                        text: tokens.text,
                        textMuted: tokens.textMuted,
                        textStrong: tokens.textStrong,
                      }}
                    />
                  </div>
                )}
                {post.imageUrl ? (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => setImageViewer({ src: post.imageUrl, title: viewerTitleBase })}
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.imageUrl}
                        alt=""
                        style={{
                          maxHeight: 360,
                          maxWidth: "100%",
                          borderRadius: 12,
                          objectFit: "contain",
                          border: `1px solid ${tokens.border}`,
                          display: "block",
                        }}
                      />
                    </button>
                  </div>
                ) : null}
              </div>
              <div style={{ height: 1, background: tokens.divider }} />
              <div style={{ padding: "10px 14px", display: "flex", gap: 12, color: tokens.textMuted, fontSize: 12, alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="heart" size={14} /> {post.likes}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="comment" size={14} /> {post.comments}
                </span>
              </div>
              <div style={{ padding: "0 14px 12px" }}>
                <SignatureFooter user={user} tokens={tokens} isLight={isLight} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontWeight: 900, color: tokens.textStrong, letterSpacing: "-0.2px" }}>Comments</div>
              <div style={{ color: tokens.textMuted, fontSize: 12 }}>{rawComments.length} total</div>
            </div>

            {!readOnly && isAuthed && (
              <div style={{ marginBottom: 14 }}>
                <FeedComposer
                  text={commentText}
                  setText={setCommentText}
                  selectedTag="General"
                  setSelectedTag={() => {}}
                  showTagPicker={false}
                  postTagOptions={["General"]}
                  imageUrl={commentImage}
                  setImageUrl={setCommentImage}
                  users={users}
                  disabled={false}
                  onSubmit={() => submitComment(null)}
                  publishLabel="Post comment"
                  tokens={tokens}
                  isLight={isLight}
                  minRows={1}
                />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {roots.map((c) => (
                <div key={c.id}>
                  <CommentBlock
                    c={c}
                    users={users}
                    handleDir={handleDir}
                    visitUserProfile={visitUserProfile}
                    tokens={tokens}
                    isLight={isLight}
                    highlightId={highlightId}
                    setImageViewer={setImageViewer}
                    shareForComment={shareForComment}
                    readOnly={readOnly}
                    isAuthed={isAuthed}
                    onReply={() => setReplyParentId((prev) => (prev === c.id ? null : c.id))}
                    replies={repliesByParent[c.id] || []}
                  />
                  {replyParentId === c.id && !readOnly && isAuthed && (
                    <div style={{ marginTop: 10, marginLeft: 20, paddingLeft: 14, borderLeft: `2px solid ${tokens.borderStrong}` }}>
                      <FeedComposer
                        text={replyText}
                        setText={setReplyText}
                        selectedTag="General"
                        setSelectedTag={() => {}}
                        showTagPicker={false}
                        postTagOptions={["General"]}
                        imageUrl={replyImage}
                        setImageUrl={setReplyImage}
                        users={users}
                        disabled={false}
                        onSubmit={() => submitComment(c.id)}
                        publishLabel="Post reply"
                        tokens={tokens}
                        isLight={isLight}
                        minRows={1}
                      />
                      <button type="button" onClick={() => setReplyParentId(null)} style={{ ...ghostBtn(tokens), marginTop: 8 }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
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

function CommentBlock({
  c,
  users,
  handleDir,
  visitUserProfile,
  tokens,
  isLight,
  highlightId,
  setImageViewer,
  shareForComment,
  readOnly,
  isAuthed,
  onReply,
  replies,
  depth = 0,
}) {
  const u = users[c.userId];
  const hi = highlightId === c.id;
  return (
    <div>
      <div
        id={`comment-${c.id}`}
        style={{
          marginLeft: depth ? 20 : 0,
          paddingLeft: depth ? 14 : 0,
          borderLeft: depth ? `2px solid ${tokens.border}` : "none",
          borderRadius: 14,
          border: `1px solid ${tokens.cardBorder}`,
          background: tokens.surfaceAlt,
          padding: "10px 12px",
          transition: "box-shadow 0.2s",
          boxShadow: hi ? "0 0 0 2px rgba(255,96,128,0.75)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 850, color: tokens.textStrong }}>{u?.name ?? "Unknown"}</div>
          <UserStatusBadgeRow user={u} tokens={tokens} isLight={isLight} chromed={isLight ? undefined : "modalDark"} dense gap={4} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <span style={{ color: tokens.textMuted, fontSize: 12 }}>@{u?.handle ?? "unknown"}</span>
          <span style={{ marginLeft: "auto", color: tokens.textMuted, fontSize: 11 }}>{new Date(c.ts).toLocaleString()}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>
          <CcsMarkdown
            source={c.text}
            accentColor="#ff9ab0"
            handleToUserId={handleDir}
            onVisitUser={visitUserProfile}
            tokens={{
              accent: tokens.accent,
              text: tokens.text,
              textMuted: tokens.textMuted,
              textStrong: tokens.textStrong,
            }}
          />
        </div>
        {c.imageUrl ? (
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() =>
                setImageViewer({
                  src: c.imageUrl,
                  title: c.text?.trim().slice(0, 48) || "Comment",
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
                borderRadius: 10,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.imageUrl}
                alt=""
                style={{
                  maxHeight: 220,
                  maxWidth: "100%",
                  borderRadius: 10,
                  objectFit: "contain",
                  border: `1px solid ${tokens.border}`,
                  display: "block",
                }}
              />
            </button>
          </div>
        ) : null}
        <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {!readOnly && isAuthed && depth === 0 && (
            <button type="button" onClick={onReply} style={actionBtnStyle(tokens)}>
              Reply
            </button>
          )}
          {shareForComment && (
            <button type="button" onClick={() => shareForComment(c.id)} style={actionBtnStyle(tokens)}>
              <Icon name="share" size={12} style={{ marginRight: 4 }} />
              Copy link
            </button>
          )}
        </div>
        <SignatureFooter user={u} tokens={tokens} isLight={isLight} compact />
      </div>
      {replies.map((r) => (
        <div key={r.id} style={{ marginTop: 10 }}>
          <CommentBlock
            c={r}
            users={users}
            handleDir={handleDir}
            visitUserProfile={visitUserProfile}
            tokens={tokens}
            isLight={isLight}
            highlightId={highlightId}
            setImageViewer={setImageViewer}
            shareForComment={shareForComment}
            readOnly={readOnly}
            isAuthed={isAuthed}
            onReply={() => {}}
            replies={[]}
            depth={1}
          />
        </div>
      ))}
    </div>
  );
}

function actionBtnStyle(tokens, kind) {
  const solid = kind === "solid";
  return {
    border: `1px solid ${tokens.border}`,
    background: solid ? "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.60))" : tokens.surface,
    color: tokens.textStrong,
    padding: "9px 11px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
  };
}

function inputStyle(tokens, isTextarea) {
  return {
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: `1px solid ${tokens.border}`,
    background: tokens.surface,
    color: tokens.text,
    padding: "10px 12px",
    outline: "none",
    fontSize: 13,
    lineHeight: 1.4,
    resize: isTextarea ? "vertical" : "none",
  };
}

function ghostBtn(tokens) {
  return {
    border: `1px solid ${tokens.border}`,
    background: tokens.surface,
    color: tokens.text,
    padding: "9px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  };
}
