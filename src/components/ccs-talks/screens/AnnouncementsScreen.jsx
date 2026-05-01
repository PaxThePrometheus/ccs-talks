"use client";

import { useEffect, useMemo, useState } from "react";
import * as api from "../api/ccsApi";
import { buildHandleDirectory } from "../components/MentionBody";
import { CcsMarkdown } from "../components/CcsMarkdown";
import { useAppState } from "../state/AppState";

export function AnnouncementsScreen() {
  const { tokens, users, visitUserProfile } = useAppState();
  const handleDir = useMemo(() => buildHandleDirectory(users), [users]);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    void api
      .getAnnouncements()
      .then((d) => {
        if (!cancel) setItems(Array.isArray(d?.announcements) ? d.announcements : []);
      })
      .catch((e) => {
        if (!cancel) setErr(e?.message || "Could not load announcements.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div
      className="ccs-scroll"
      style={{
        position: "fixed",
        top: 0,
        left: "var(--ccs-shell-left)",
        right: 0,
        bottom: 0,
        overflowY: "auto",
        padding: "1.75rem var(--ccs-shell-pad-x) 2.5rem",
        borderLeft: `1px solid ${tokens.divider}`,
        color: tokens.text,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", margin: 0 }}>Announcements</h1>
        <p style={{ color: tokens.textMuted, marginTop: 8, fontSize: 14, lineHeight: 1.55 }}>
          Official updates from CCS Talks moderators and administrators.
        </p>

        {err && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: `1px solid ${tokens.border}`, background: tokens.surfaceAlt, color: tokens.text }}>
            {err}
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.length === 0 && !err && <div style={{ color: tokens.textMuted, fontSize: 14 }}>No announcements yet.</div>}
          {items.map((a) => (
            <article
              key={a.id}
              style={{
                borderRadius: 16,
                border: `1px solid ${tokens.cardBorder}`,
                background: tokens.cardBg,
                padding: "14px 16px",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {a.pinned ? (
                  <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", color: tokens.accent }}>PINNED</span>
                ) : null}
                <span style={{ fontSize: 12, color: tokens.textSubtle }}>{new Date(a.createdAt).toLocaleString()}</span>
              </div>
              <h2 style={{ margin: "8px 0 6px", fontSize: 18, fontWeight: 900, color: tokens.textStrong }}>{a.title}</h2>
              <div style={{ marginTop: 4 }}>
                <CcsMarkdown
                  source={a.body}
                  accentColor={tokens.accent}
                  handleToUserId={handleDir}
                  onVisitUser={visitUserProfile}
                  tokens={tokens}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
