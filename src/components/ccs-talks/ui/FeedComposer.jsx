"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";

const MAX_LOCAL_IMAGE_BYTES = 256_000;

function buildUserList(users) {
  if (!users || typeof users !== "object") return [];
  return Object.values(users)
    .filter((u) => u && u.id && u.handle)
    .map((u) => ({ id: u.id, handle: String(u.handle), name: String(u.name || "") }))
    .slice(0, 500);
}

function getMentionQuery(text, cursorPos) {
  const before = text.slice(0, cursorPos);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  const prev = at > 0 ? before[at - 1] : " ";
  if (prev && !/\s/.test(prev)) return null;
  const tail = before.slice(at + 1);
  if (!/^[\w.]*$/.test(tail)) return null;
  return { start: at, query: tail };
}

export function FeedComposer({
  text,
  setText,
  selectedTag,
  setSelectedTag,
  postTagOptions = ["General", "Academics", "Tech", "Events"],
  showTagPicker = true,
  imageUrl,
  setImageUrl,
  users,
  disabled = false,
  onSubmit,
  publishLabel = "Publish",
  tokens,
  isLight,
  minRows = 2,
}) {
  const taRef = useRef(null);
  const [imgOpen, setImgOpen] = useState(false);
  const [imgTab, setImgTab] = useState("upload");
  const [pasteUrl, setPasteUrl] = useState("");
  const [mention, setMention] = useState(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const fileRef = useRef(null);

  const userList = useMemo(() => buildUserList(users), [users]);

  const mentionPicks = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return userList
      .filter((u) => !q || u.handle.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [mention, userList]);

  const syncMention = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    const q = getMentionQuery(el.value, el.selectionStart);
    if (!q) {
      setMention(null);
      return;
    }
    setMention(q);
    setMentionIdx(0);
  }, []);

  useEffect(() => {
    if (!mention || mentionPicks.length === 0) return;
    setMentionIdx((i) => Math.min(i, mentionPicks.length - 1));
  }, [mention, mentionPicks.length]);

  const insertMention = (handle) => {
    const el = taRef.current;
    if (!el || !mention) return;
    const { start, query } = mention;
    const v = el.value;
    const before = v.slice(0, start);
    const after = v.slice(start + 1 + query.length);
    const next = `${before}@${handle} ${after}`;
    setText(next);
    setMention(null);
    requestAnimationFrame(() => {
      const pos = before.length + 1 + handle.length + 1;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    if (f.size > MAX_LOCAL_IMAGE_BYTES) {
      window.alert(`Image must be under ~${Math.round(MAX_LOCAL_IMAGE_BYTES / 1024)} KB, or paste an https URL instead.`);
      return;
    }
    const fr = new FileReader();
    fr.onload = () => {
      const url = typeof fr.result === "string" ? fr.result : "";
      setImageUrl(url);
      setImgOpen(false);
    };
    fr.readAsDataURL(f);
  };

  const applyPasteUrl = () => {
    const u = pasteUrl.trim();
    if (!/^https?:\/\//i.test(u)) {
      window.alert("Paste a full https:// or http:// image URL.");
      return;
    }
    setImageUrl(u.slice(0, 4096));
    setPasteUrl("");
    setImgOpen(false);
  };

  const border = tokens.border;
  const card = tokens.cardBg;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: card,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: 18,
        padding: "12px 14px",
        backdropFilter: "blur(12px)",
        boxShadow: isLight ? "0 12px 24px rgba(60,0,20,0.08)" : "0 18px 60px rgba(0,0,0,0.30)",
        position: "relative",
      }}
    >
      {showTagPicker ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Icon name="hash" size={14} style={{ color: tokens.textMuted, flexShrink: 0 }} />
          {postTagOptions.map((t) => (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedTag(t)}
              style={{
                border: `1px solid ${border}`,
                background: selectedTag === t ? (isLight ? "rgba(60,0,20,0.10)" : "rgba(255,255,255,0.10)") : tokens.surfaceAlt,
                color: tokens.text,
                padding: "5px 10px",
                borderRadius: 999,
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: 800,
                fontSize: 11,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      <textarea
        ref={taRef}
        value={text}
        disabled={disabled}
        rows={minRows}
        onChange={(e) => {
          setText(e.target.value);
          syncMention();
        }}
        onKeyUp={syncMention}
        onClick={syncMention}
        onKeyDown={(e) => {
          if (mention && mentionPicks.length) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setMentionIdx((i) => (i + 1) % mentionPicks.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setMentionIdx((i) => (i - 1 + mentionPicks.length) % mentionPicks.length);
            } else if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              insertMention(mentionPicks[mentionIdx].handle);
            } else if (e.key === "Escape") {
              setMention(null);
            }
          } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder={disabled ? "Sign in to start posting…" : "What's on your mind? (@mention people, Ctrl+Enter to publish)"}
        style={{
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
          minHeight: 56,
          background: tokens.surfaceAlt,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: "10px 12px",
          color: tokens.text,
          fontSize: 14,
          outline: "none",
          opacity: disabled ? 0.65 : 1,
          fontFamily: "inherit",
        }}
      />

      {mention && mentionPicks.length > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            bottom: 52,
            zIndex: 5,
            borderRadius: 12,
            border: `1px solid ${border}`,
            background: isLight ? "#fff" : "rgba(24,0,10,0.96)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {mentionPicks.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => insertMention(u.handle)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                border: "none",
                borderBottom: `1px solid ${tokens.divider}`,
                background: i === mentionIdx ? (isLight ? "rgba(192,0,42,0.08)" : "rgba(255,96,128,0.12)") : "transparent",
                color: tokens.text,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <b>@{u.handle}</b> <span style={{ color: tokens.textMuted }}>{u.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setImgOpen((o) => !o)}
          title="Attach image"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 12,
            border: `1px solid ${border}`,
            background: tokens.surfaceAlt,
            color: tokens.text,
            cursor: disabled ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          <Icon name="image" size={16} />
          Image
        </button>
        {imageUrl ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setImageUrl("")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 10px",
              borderRadius: 12,
              border: `1px solid ${border}`,
              background: "transparent",
              color: tokens.textMuted,
              cursor: disabled ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <Icon name="x" size={14} /> Remove image
          </button>
        ) : null}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSubmit?.()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(135deg, #c0002a, #8b0020)",
            border: "none",
            color: "#fff",
            padding: "9px 18px",
            borderRadius: 12,
            cursor: disabled ? "not-allowed" : "pointer",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          <Icon name="send" size={15} />
          {publishLabel}
        </button>
      </div>

      {imgOpen ? (
        <div
          style={{
            marginTop: 4,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${border}`,
            background: tokens.surfaceAlt,
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={() => setImgTab("upload")} style={tabStyle(imgTab === "upload", tokens)}>
              Upload
            </button>
            <button type="button" onClick={() => setImgTab("url")} style={tabStyle(imgTab === "url", tokens)}>
              Paste URL
            </button>
          </div>
          {imgTab === "upload" ? (
            <button type="button" onClick={() => fileRef.current?.click()} style={{ ...tabStyle(true, tokens), width: "100%" }}>
              Choose image file…
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="https://…"
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: tokens.inputBg,
                  color: tokens.text,
                }}
              />
              <button type="button" onClick={applyPasteUrl} style={{ ...tabStyle(true, tokens), whiteSpace: "nowrap" }}>
                Use URL
              </button>
            </div>
          )}
        </div>
      ) : null}

      {imageUrl ? (
        <div style={{ marginTop: 4 }}>
          <img
            src={imageUrl}
            alt=""
            style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 10, objectFit: "contain", border: `1px solid ${border}` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function tabStyle(active, tokens) {
  return {
    padding: "6px 12px",
    borderRadius: 10,
    border: `1px solid ${tokens.border}`,
    background: active ? "linear-gradient(135deg, rgba(255,96,128,0.22), rgba(155,0,40,0.45))" : tokens.surface,
    color: tokens.text,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  };
}
