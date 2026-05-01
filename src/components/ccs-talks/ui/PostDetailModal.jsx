"use client";

import { useEffect, useMemo, useState } from "react";
import { THEME } from "../theme";
import { useAppState } from "../state/AppState";
import { Icon } from "./Icon";
import { CcsMarkdown } from "../components/CcsMarkdown";
import { buildHandleDirectory } from "../components/MentionBody";
import { SignatureFooter } from "../components/SignatureFooter";
import { FeedComposer } from "./FeedComposer";
import { ForumImageLightbox } from "./ForumImageLightbox";
import { UserStatusBadgeRow } from "./UserStatusBadgeRow";

export function PostDetailModal({ open, postId, onClose }) {
  const {
    posts,
    users,
    commentsByPostId,
    addComment,
    updatePost,
    sharePost,
    reportPost,
    profile,
    loadCommentsFromServer,
    prefs,
    tokens,
    visitUserProfile,
  } = useAppState();
  const isLight = prefs.mode === "light";
  const [commentText, setCommentText] = useState("");
  const [commentImage, setCommentImage] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [imageViewer, setImageViewer] = useState(null);

  const post = useMemo(() => posts.find((p) => String(p.id) === String(postId)), [posts, postId]);
  const user = post ? users[post.userId] : null;
  const comments = (postId != null && commentsByPostId[String(postId)]) || commentsByPostId[postId] || [];
  const canEdit = post && post.userId === profile.id;
  const handleDir = useMemo(() => buildHandleDirectory(users), [users]);

  useEffect(() => {
    if (!open || postId == null) return undefined;
    void loadCommentsFromServer(postId);
    return undefined;
  }, [open, postId, loadCommentsFromServer]);

  useEffect(() => {
    if (!open) setImageViewer(null);
  }, [open]);

  if (!open || !post) return null;

  const handleStartEdit = () => {
    setEditing(true);
    setEditText(post.content);
  };

  const handleSaveEdit = () => {
    updatePost(post.id, { content: editText });
    setEditing(false);
  };

  const submitComment = () => {
    const v = commentText.trim();
    if (!v) return;
    addComment(post.id, { userId: profile.id, text: v, imageUrl: commentImage });
    setCommentText("");
    setCommentImage("");
  };

  const viewerTitleBase = post.content?.trim().slice(0, 48) || "Post";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 650, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)", backdropFilter: "blur(8px)" }} />

      <div
        style={{
          position: "relative",
          width: "min(980px, 96vw)",
          maxHeight: "min(82vh, 860px)",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,0,8,0.76)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 34px 120px rgba(0,0,0,0.60)",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.60))" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.2px", lineHeight: 1.1 }}>{user?.name ?? "Unknown"}</div>
                <UserStatusBadgeRow user={user} chromed="modalDark" dense gap={6} />
              </div>
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, color: "rgba(240,220,220,0.62)", fontSize: 12 }}>
                <span>
                  @{user?.handle ?? "unknown"} · {post.time}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => sharePost(post.id)} style={actionBtnStyle()}>
              <Icon name="share" size={14} style={{ marginRight: 6 }} />
              Share
            </button>
            <button onClick={() => reportPost(post.id, "Inappropriate content")} style={actionBtnStyle()}>
              <Icon name="flag" size={14} style={{ marginRight: 6 }} />
              Report
            </button>
            {canEdit && !editing && (
              <button onClick={handleStartEdit} style={actionBtnStyle()}>
                <Icon name="pencil" size={14} style={{ marginRight: 6 }} />
                Edit
              </button>
            )}
            {editing && (
              <button onClick={handleSaveEdit} style={actionBtnStyle("solid")}>
                Save
              </button>
            )}
            <button onClick={onClose} style={actionBtnStyle()}>
              Close
            </button>
          </div>
        </div>

        <div className="ccs-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: THEME.colors.cardBg, backdropFilter: "blur(12px)", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px" }}>
              {editing ? (
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} style={inputStyle(true)} />
              ) : (
                <div style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(240,220,220,0.92)" }}>
                  <CcsMarkdown
                    source={post.content}
                    accentColor="#ff9ab0"
                    handleToUserId={handleDir}
                    onVisitUser={visitUserProfile}
                    tokens={{
                      accent: tokens.accent,
                      text: "rgba(240,220,220,0.92)",
                      textMuted: "rgba(240,200,205,0.72)",
                      textStrong: "#fff",
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
                    {/* eslint-disable-next-line @next/next/no-img-element -- user content */}
                    <img
                      src={post.imageUrl}
                      alt=""
                      style={{ maxHeight: 360, maxWidth: "100%", borderRadius: 12, objectFit: "contain", border: "1px solid rgba(255,255,255,0.12)", display: "block" }}
                    />
                  </button>
                </div>
              ) : null}
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ padding: "10px 14px", display: "flex", gap: 12, color: "rgba(240,220,220,0.65)", fontSize: 12, alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="heart" size={14} /> {post.likes}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="comment" size={14} /> {post.comments}
              </span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
                {post.bookmarked ? (
                  <>
                    <Icon name="bookmark" size={14} /> Bookmarked
                  </>
                ) : null}
              </span>
            </div>
            <div style={{ padding: "0 14px 12px" }}>
              <SignatureFooter user={user} tokens={tokens} isLight={isLight} />
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.2px" }}>Comments</div>
            <div style={{ color: "rgba(240,220,220,0.6)", fontSize: 12 }}>{comments.length} total</div>
          </div>

          <div style={{ marginTop: 10 }}>
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
              onSubmit={submitComment}
              publishLabel="Post comment"
              tokens={tokens}
              isLight={isLight}
              minRows={1}
            />
          </div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {comments.map((c) => {
              const u = users[c.userId];
              return (
                <div key={c.id} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(30,0,12,0.52)", backdropFilter: "blur(12px)", padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 850, color: "#fff" }}>{u?.name ?? "Unknown"}</div>
                    <UserStatusBadgeRow user={u} chromed="modalDark" dense gap={4} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    <span style={{ color: "rgba(240,220,220,0.6)", fontSize: 12 }}>@{u?.handle ?? "unknown"}</span>
                    <span style={{ marginLeft: "auto", color: "rgba(240,220,220,0.45)", fontSize: 11 }}>{new Date(c.ts).toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55 }}>
                    <CcsMarkdown
                      source={c.text}
                      accentColor="#ff9ab0"
                      handleToUserId={handleDir}
                      onVisitUser={visitUserProfile}
                      tokens={{
                        accent: tokens.accent,
                        text: "rgba(240,220,220,0.85)",
                        textMuted: "rgba(230,190,195,0.70)",
                        textStrong: "#fff",
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
                            border: "1px solid rgba(255,255,255,0.10)",
                            display: "block",
                          }}
                        />
                      </button>
                    </div>
                  ) : null}
                  <SignatureFooter user={u} tokens={tokens} isLight={isLight} compact />
                </div>
              );
            })}
          </div>
        </div>
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

function actionBtnStyle(kind) {
  const solid = kind === "solid";
  return {
    border: "1px solid rgba(255,255,255,0.12)",
    background: solid ? "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.60))" : "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.90)",
    padding: "9px 11px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
  };
}

function inputStyle(isTextarea) {
  return {
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
    color: "#fff",
    padding: "10px 12px",
    outline: "none",
    fontSize: 13,
    lineHeight: 1.4,
    resize: isTextarea ? "vertical" : "none",
  };
}
