"use client";
import { useAdminDraft } from "./useAdminDraft";
import { useEffect, useRef, useState } from "react";
import { CcsMarkdown } from "@/components/ccs-talks/components/CcsMarkdown";
import { jsonFetch } from "./adminFetch";
import { adminTheme as theme } from "./adminUi";
const markdownTokens = {
  text: theme.text,
  textStrong: theme.textStrong,
  textMuted: theme.muted,
  accent: theme.accent,
  border: theme.border,
  surfaceAlt: theme.surfaceAlt,
};

export function AnnouncementEditor({
  viewer,
  selectedAnnouncement: initial,
  onError,
}) {
  const [saved, setSaved] = useState(initial || null);
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [pinned, setPinned] = useState(initial?.pinned || false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const isAdmin = viewer.role === "admin";
  const dirty =
    title !== (saved?.title || "") ||
    body !== (saved?.body || "") ||
    pinned !== !!saved?.pinned;
  useAdminDraft(dirty);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    try {
      const out = await jsonFetch(
        saved
          ? `/api/admin/announcements/${encodeURIComponent(saved.id)}`
          : "/api/admin/announcements",
        {
          method: saved ? "PATCH" : "POST",
          body: JSON.stringify({
            title,
            body,
            pinned,
            ...(saved ? { expectedVersion: saved.version } : {}),
          }),
        },
      );
      setSaved(out.announcement);
      setTitle(out.announcement.title);
      setBody(out.announcement.body);
      setPinned(out.announcement.pinned);
      setMessage(saved ? "Announcement updated." : "Announcement published.");
    } catch (error) {
      onError(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function reload() {
    if (
      dirty &&
      !window.confirm(
        "Discard this announcement draft and reload the saved version?",
      )
    )
      return;
    try {
      const out = await jsonFetch(
        `/api/admin/announcements?id=${encodeURIComponent(saved.id)}`,
      );
      const latest = out.announcements?.[0];
      if (!latest) throw new Error("Announcement no longer exists.");
      setSaved(latest);
      setTitle(latest.title);
      setBody(latest.body);
      setPinned(latest.pinned);
      setMessage("Latest announcement loaded.");
    } catch (error) {
      onError(error);
    }
  }
  async function remove() {
    if (
      lock.current ||
      !saved ||
      !window.confirm(
        "Delete this announcement? Its previous version will be retained in staff history.",
      )
    )
      return;
    lock.current = true;
    setPending(true);
    try {
      await jsonFetch(
        `/api/admin/announcements/${encodeURIComponent(saved.id)}`,
        { method: "DELETE" },
      );
      setMessage("Announcement deleted.");
    } catch (error) {
      onError(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <div className="admin-editor">
      <label className="admin-field">
        Title
        <input
          value={title}
          maxLength={200}
          disabled={!isAdmin || pending}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="admin-field">
        Announcement
        <textarea
          aria-label="Announcement"
          value={body}
          rows={9}
          maxLength={8000}
          disabled={!isAdmin || pending}
          onChange={(event) => setBody(event.target.value)}
        />
        <span className="inspector-caption">
          {body.length.toLocaleString()} / 8,000 · Markdown supported
        </span>
      </label>
      <label className="admin-checkbox">
        <input
          type="checkbox"
          checked={pinned}
          disabled={!isAdmin || pending}
          onChange={(event) => setPinned(event.target.checked)}
        />
        Pin to the top of announcements
      </label>
      <section className="inspector-preview" aria-label="Announcement preview">
        <p className="inspector-eyebrow">PREVIEW</p>
        <h2>{title || "Announcement title"}</h2>
        <CcsMarkdown
          source={body || "Your announcement will appear here."}
          tokens={markdownTokens}
          accentColor={theme.accent}
        />
      </section>
      {isAdmin && (
        <div className="inspector-actions">
          <button
            className="inspector-button primary"
            disabled={pending || !title.trim() || !dirty}
            onClick={save}
          >
            {pending
              ? "Saving…"
              : saved
                ? "Save announcement"
                : "Publish announcement"}
          </button>
          <button
            className="inspector-button"
            disabled={pending || !dirty}
            onClick={() => {
              if (window.confirm("Discard these announcement changes?")) {
                setTitle(saved?.title || "");
                setBody(saved?.body || "");
                setPinned(!!saved?.pinned);
              }
            }}
          >
            Discard changes
          </button>
          {saved && (
            <>
              <button
                className="inspector-button"
                disabled={pending}
                onClick={reload}
              >
                Reload announcement
              </button>
              <button
                className="inspector-button"
                disabled={pending}
                onClick={remove}
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
      {saved && (
        <p className="inspector-caption">
          Published {new Date(saved.createdAt).toLocaleString()} · By{" "}
          {saved.authorId}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}

export function PostEditor({ selectedPost: initial, onError }) {
  const [post, setPost] = useState(initial);
  const [context, setContext] = useState({ comments: [], revisions: [] });
  const [contextError, setContextError] = useState("");
  const [selectedRevision, setSelectedRevision] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    jsonFetch(`/api/admin/posts/${encodeURIComponent(initial.id)}`, {
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted)
          setContext({
            comments: value.comments || [],
            revisions: value.revisions || [],
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setContextError(error.message);
      });
    return () => controller.abort();
  }, [initial.id]);
  const [content, setContent] = useState(initial.content || "");
  const [pinned, setPinned] = useState(!!initial.pinned);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const dirty = content !== post.content || pinned !== !!post.pinned;
  useAdminDraft(dirty);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      const out = await jsonFetch(
        `/api/admin/posts/${encodeURIComponent(post.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            content,
            pinned,
            reason,
            expectedVersion: post.version,
          }),
        },
      );
      setPost(out.post);
      setContent(out.post.content);
      setPinned(out.post.pinned);
      setMessage("Post saved. Previous content is retained in staff history.");
    } catch (error) {
      onError(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function remove() {
    if (
      lock.current ||
      !window.confirm(
        "Remove this post and its comments? Any reports retain a snapshot for staff review.",
      )
    )
      return;
    lock.current = true;
    setPending(true);
    try {
      await jsonFetch(`/api/admin/posts/${encodeURIComponent(post.id)}`, {
        method: "DELETE",
      });
      setMessage("Post removed. Report evidence was retained.");
    } catch (error) {
      onError(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function reloadPost() {
    if (
      dirty &&
      !window.confirm(
        "Discard this post draft and load the latest saved version?",
      )
    )
      return;
    try {
      const out = await jsonFetch(
        `/api/admin/posts/${encodeURIComponent(post.id)}`,
      );
      setPost(out.post);
      setContent(out.post.content);
      setPinned(out.post.pinned);
      setContext({
        comments: out.comments || [],
        revisions: out.revisions || [],
      });
      setContextError("");
      setMessage("Latest post loaded.");
    } catch (error) {
      onError(error);
    }
  }
  async function removeComment(comment) {
    if (
      lock.current ||
      !reason.trim() ||
      !window.confirm(
        "Remove this comment? Its content and your reason will be retained in staff history.",
      )
    )
      return;
    lock.current = true;
    setPending(true);
    try {
      await jsonFetch(
        `/api/admin/posts/${encodeURIComponent(post.id)}/comments/${encodeURIComponent(comment.id)}`,
        { method: "DELETE", body: JSON.stringify({ reason }) },
      );
      setContext((previous) => ({
        ...previous,
        comments: previous.comments.filter((row) => row.id !== comment.id),
      }));
      setMessage("Comment removed. Evidence retained.");
    } catch (error) {
      onError(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  const revision = context.revisions.find((row) => row.id === selectedRevision);
  return (
    <div className="admin-editor">
      <a
        className="inspector-button"
        href={`/p/${encodeURIComponent(post.id)}`}
        target="_blank"
        rel="noreferrer"
      >
        Open post in forum
      </a>
      <label className="admin-field">
        Post content
        <textarea
          aria-label="Post content"
          rows={10}
          maxLength={12800}
          value={content}
          disabled={pending}
          onChange={(event) => setContent(event.target.value)}
        />
        <span className="inspector-caption">
          {content.length.toLocaleString()} / 12,800 · Markdown supported
        </span>
      </label>
      <label className="admin-checkbox">
        <input
          type="checkbox"
          checked={pinned}
          disabled={pending}
          onChange={(event) => setPinned(event.target.checked)}
        />
        Pin this post
      </label>
      <label className="admin-field">
        Moderation reason
        <input
          value={reason}
          maxLength={500}
          disabled={pending}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this content is changing"
        />
      </label>
      <section className="inspector-preview" aria-label="Post preview">
        <CcsMarkdown
          source={content}
          tokens={markdownTokens}
          accentColor={theme.accent}
        />
        {post.imageUrl && <img src={post.imageUrl} alt="Post attachment" />}
      </section>
      <div className="inspector-actions">
        <button
          className="inspector-button primary"
          disabled={pending || !dirty || !content.trim() || !reason.trim()}
          onClick={save}
        >
          {pending ? "Saving…" : "Save post"}
        </button>
        <button
          className="inspector-button"
          disabled={pending || !dirty}
          onClick={() => {
            if (window.confirm("Discard post changes?")) {
              setContent(post.content);
              setPinned(!!post.pinned);
            }
          }}
        >
          Discard changes
        </button>
        <button
          className="inspector-button"
          disabled={pending}
          onClick={reloadPost}
        >
          Reload post
        </button>
        <button
          className="inspector-button"
          disabled={pending}
          onClick={remove}
        >
          Remove post
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <section className="admin-editor" aria-label="Post comments">
        <h2 style={{ fontSize: 18 }}>Comment moderation</h2>
        <p className="inspector-caption">
          Showing up to 100 latest comments. Use the moderation reason above
          before removing a comment.
        </p>
        {contextError && <p role="alert">{contextError}</p>}
        {!context.comments.length && !contextError && (
          <p className="inspector-caption">No comments to review.</p>
        )}
        {context.comments.map((comment) => (
          <article key={comment.id} className="inspector-preview">
            <p className="inspector-caption">
              {comment.author_name || comment.user_id} ·{" "}
              {new Date(Number(comment.created_at)).toLocaleString()}
            </p>
            <CcsMarkdown
              source={comment.body}
              tokens={markdownTokens}
              accentColor={theme.accent}
            />
            <button
              className="inspector-button"
              disabled={pending || !reason.trim()}
              onClick={() => removeComment(comment)}
            >
              Remove comment
            </button>
          </article>
        ))}
      </section>
      <section className="admin-editor">
        <h2 style={{ fontSize: 18 }}>Edit history</h2>
        <label className="admin-field">
          Previous post revision
          <select
            value={selectedRevision}
            onChange={(event) => setSelectedRevision(event.target.value)}
          >
            <option value="">Choose a previous revision</option>
            {context.revisions.map((row) => (
              <option key={row.id} value={row.id}>
                {new Date(Number(row.created_at)).toLocaleString()} ·{" "}
                {row.actor_id} · {row.reason}
              </option>
            ))}
          </select>
        </label>
        {revision && (
          <div className="inspector-preview">
            <CcsMarkdown
              source={revision.value.content || ""}
              tokens={markdownTokens}
              accentColor={theme.accent}
            />
          </div>
        )}
      </section>
    </div>
  );
}
