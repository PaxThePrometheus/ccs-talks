"use client";

import { useEffect, useMemo, useState } from "react";
import { THEME } from "../theme";
import { useAppState } from "../state/AppState";

export function PostDetailModal({ open, postId, onClose }) {
  const { posts, users, commentsByPostId, addComment, updatePost, sharePost, reportPost, profile, loadCommentsFromServer } = useAppState();
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const post = useMemo(() => posts.find((p) => String(p.id) === String(postId)), [posts, postId]);
  const user = post ? users[post.userId] : null;
  const comments = (postId != null && commentsByPostId[String(postId)]) || commentsByPostId[postId] || [];
  const canEdit = post && post.userId === profile.id;

  useEffect(() => {
    if (!open || postId == null) return undefined;
    void loadCommentsFromServer(postId);
    return undefined;
  }, [open, postId, loadCommentsFromServer]);

  if (!open || !post) return null;

  const handleStartEdit = () => {
    setEditing(true);
    setEditText(post.content);
  };

  const handleSaveEdit = () => {
    updatePost(post.id, { content: editText });
    setEditing(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 650, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)", backdropFilter: "blur(8px)" }} />

      <div
        className="ccs-scroll"
        style={{
          position: "relative",
          width: "min(980px, 96vw)",
          maxHeight: "min(88vh, 920px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,0,8,0.76)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 34px 120px rgba(0,0,0,0.60)",
        }}
      >
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.60))" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.2px", lineHeight: 1.1 }}>{user?.name ?? "Unknown"}</div>
              <div style={{ marginTop: 2, color: "rgba(240,220,220,0.62)", fontSize: 12 }}>
                @{user?.handle ?? "unknown"} · {post.time}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => sharePost(post.id)} style={actionBtnStyle()}>
              Share
            </button>
            <button onClick={() => reportPost(post.id, "Inappropriate content")} style={actionBtnStyle()}>
              Report
            </button>
            {canEdit && !editing && (
              <button onClick={handleStartEdit} style={actionBtnStyle()}>
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

        <div style={{ padding: 16 }}>
          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: THEME.colors.cardBg, backdropFilter: "blur(12px)", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px" }}>
              {editing ? (
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} style={inputStyle(true)} />
              ) : (
                <div style={{ color: "rgba(240,220,220,0.90)", fontSize: 15, lineHeight: 1.65 }}>{post.content}</div>
              )}
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ padding: "10px 14px", display: "flex", gap: 10, color: "rgba(240,220,220,0.65)", fontSize: 12 }}>
              <span>♥ {post.likes}</span>
              <span>💬 {post.comments}</span>
              <span style={{ marginLeft: "auto" }}>{post.bookmarked ? "🔖 Bookmarked" : ""}</span>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.2px" }}>Comments</div>
            <div style={{ color: "rgba(240,220,220,0.6)", fontSize: 12 }}>{comments.length} total</div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              style={inputStyle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = commentText.trim();
                  if (!v) return;
                  addComment(post.id, { userId: profile.id, text: v });
                  setCommentText("");
                }
              }}
            />
            <button
              onClick={() => {
                const v = commentText.trim();
                if (!v) return;
                addComment(post.id, { userId: profile.id, text: v });
                setCommentText("");
              }}
              style={actionBtnStyle("solid")}
            >
              Post
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {comments.map((c) => {
              const u = users[c.userId];
              return (
                <div key={c.id} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(30,0,12,0.52)", backdropFilter: "blur(12px)", padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 850, color: "#fff" }}>{u?.name ?? "Unknown"}</div>
                    <div style={{ color: "rgba(240,220,220,0.6)", fontSize: 12 }}>@{u?.handle ?? "unknown"}</div>
                    <div style={{ marginLeft: "auto", color: "rgba(240,220,220,0.45)", fontSize: 11 }}>{new Date(c.ts).toLocaleString()}</div>
                  </div>
                  <div style={{ marginTop: 6, color: "rgba(240,220,220,0.82)", fontSize: 13, lineHeight: 1.55 }}>{c.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
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

