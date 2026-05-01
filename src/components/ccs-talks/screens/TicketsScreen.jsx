"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "../api/ccsApi";
import { useAppState } from "../state/AppState";

export function TicketsScreen({ onNeedSignIn }) {
  const { tokens, isAuthed } = useAppState();
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!isAuthed) return;
    setErr("");
    try {
      const d = await api.getMyTickets();
      setTickets(Array.isArray(d?.tickets) ? d.tickets : []);
    } catch (e) {
      setErr(e?.message || "Could not load tickets.");
    }
  }, [isAuthed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitTicket(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await api.createTicket({ subject: subject.trim(), body: body.trim() });
      setSubject("");
      setBody("");
      setMsg("Ticket submitted. Staff will reply when they can.");
      await load();
    } catch (e) {
      setErr(e?.message || "Could not submit ticket.");
    }
  }

  if (!isAuthed) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "var(--ccs-shell-left)",
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.75rem var(--ccs-shell-pad-x)",
          borderLeft: `1px solid ${tokens.divider}`,
          color: tokens.text,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontWeight: 950, color: tokens.textStrong, fontSize: 20 }}>Sign in to use tickets</div>
          <p style={{ color: tokens.textMuted, fontSize: 14, marginTop: 8 }}>Create a support ticket after you sign in.</p>
          <button
            type="button"
            onClick={() => onNeedSignIn?.()}
            style={{
              marginTop: 14,
              padding: "10px 18px",
              borderRadius: 12,
              border: `1px solid ${tokens.border}`,
              background: tokens.surfaceStrong,
              color: tokens.textStrong,
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

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
        <h1 style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", margin: 0 }}>Support tickets</h1>
        <p style={{ color: tokens.textMuted, marginTop: 8, fontSize: 14, lineHeight: 1.55 }}>Reach moderators privately. Replies appear on your ticket.</p>

        <form onSubmit={submitTicket} style={{ marginTop: 20, padding: 16, borderRadius: 16, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg }}>
          <div style={{ fontWeight: 900, marginBottom: 10, color: tokens.textStrong }}>New ticket</div>
          <label style={{ display: "block", fontSize: 12, color: tokens.textMuted }}>Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 4,
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${tokens.border}`,
              background: tokens.inputBg,
              color: tokens.text,
            }}
          />
          <label style={{ display: "block", fontSize: 12, color: tokens.textMuted }}>Details</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={8000}
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 4,
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${tokens.border}`,
              background: tokens.inputBg,
              color: tokens.text,
              resize: "vertical",
            }}
          />
          <button
            type="submit"
            disabled={!subject.trim() || !body.trim()}
            style={{
              marginTop: 12,
              padding: "10px 18px",
              borderRadius: 12,
              border: `1px solid ${tokens.border}`,
              background: `linear-gradient(135deg, rgba(255,96,128,0.22), rgba(155,0,40,0.45))`,
              color: "#fff",
              fontWeight: 850,
              cursor: subject.trim() && body.trim() ? "pointer" : "not-allowed",
              opacity: subject.trim() && body.trim() ? 1 : 0.6,
            }}
          >
            Submit
          </button>
          {msg && <div style={{ marginTop: 10, fontSize: 13, color: tokens.textMuted }}>{msg}</div>}
          {err && <div style={{ marginTop: 10, fontSize: 13, color: "#c44" }}>{err}</div>}
        </form>

        <div style={{ marginTop: 28 }}>
          <div style={{ fontWeight: 900, color: tokens.textStrong }}>Your tickets</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {tickets.length === 0 && <div style={{ color: tokens.textMuted, fontSize: 14 }}>No tickets yet.</div>}
            {tickets.map((t) => (
              <article
                key={t.id}
                style={{
                  borderRadius: 16,
                  border: `1px solid ${tokens.cardBorder}`,
                  background: tokens.surface,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ color: tokens.textStrong }}>{t.subject}</strong>
                  <span style={{ fontSize: 12, fontWeight: 800, color: t.status === "open" ? tokens.accent : tokens.textMuted }}>
                    {String(t.status || "open").toUpperCase()}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: tokens.textMuted, whiteSpace: "pre-wrap" }}>{t.body}</div>
                {t.staffReply ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 10,
                      borderRadius: 12,
                      border: `1px solid ${tokens.border}`,
                      background: tokens.surfaceAlt,
                      fontSize: 13,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: tokens.accent }}>STAFF REPLY</div>
                    <div style={{ marginTop: 6, color: tokens.text }}>{t.staffReply}</div>
                  </div>
                ) : null}
                <div style={{ marginTop: 8, fontSize: 11, color: tokens.textSubtle }}>
                  Updated {new Date(t.updatedAt).toLocaleString()}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
