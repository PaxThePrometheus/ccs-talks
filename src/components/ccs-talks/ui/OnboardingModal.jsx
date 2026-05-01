"use client";

import { useEffect, useState } from "react";
import { useAppState } from "../state/AppState";
import * as api from "../api/ccsApi";

const TAG_CHOICES = ["Academics", "Events", "Tech"];

export function OnboardingModal({ open }) {
  const {
    tokens,
    profile,
    setProfile,
    prefs,
    updatePrefs,
    toggleTagSub,
    subs,
    persistFullProfile,
  } = useAppState();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setStep(0);
      setErr("");
    }
  }, [open]);

  if (!open) return null;

  const finish = async () => {
    setBusy(true);
    setErr("");
    try {
      await persistFullProfile(profile);
      await api.patchAccount({ prefs: { ...prefs, onboardingCompleted: true }, subs });
      updatePrefs({ onboardingCompleted: true });
    } catch (e) {
      setErr(e?.message || "Could not save preferences.");
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  const nextFromProfile = async () => {
    if (!String(profile.handle || "").trim()) {
      setErr("Pick a handle to continue.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await persistFullProfile(profile);
    } catch {
      /** persistFullProfile warns; still allow onward */
    } finally {
      setBusy(false);
    }
    setStep(2);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ccs-onboarding-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: "min(460px, 100%)",
          borderRadius: 20,
          border: `1px solid ${tokens.cardBorder}`,
          background: tokens.cardBg,
          backdropFilter: "blur(14px)",
          boxShadow: "0 28px 80px rgba(0,0,0,0.45)",
          padding: "1.65rem 1.5rem 1.4rem",
          color: tokens.text,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: tokens.textMuted }}>ONBOARDING</div>
        <h2 id="ccs-onboarding-title" style={{ margin: "10px 0 6px", fontWeight: 950, letterSpacing: "-0.3px", color: tokens.textStrong, fontSize: 22 }}>
          {step === 0 && "Welcome to CCS Talks"}
          {step === 1 && "Tune your profile"}
          {step === 2 && "Follow a few topics"}
        </h2>
        <p style={{ margin: 0, color: tokens.textMuted, fontSize: 14, lineHeight: 1.55 }}>
          {step === 0 && "Posts, classmates, orgs — all in one place. We’ll spend under a minute so your feed fits you."}
          {step === 1 && "These show on your cards and mentions. You can change everything later from your profile."}
          {step === 2 && "Pick tags that match how you browse. Skip any you’re not interested in yet."}
        </p>

        {err && (
          <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,125,153,0.45)", fontSize: 13, fontWeight: 800, color: "#ff97aa" }}>
            {err}
          </div>
        )}

        {step === 1 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: tokens.textStrong }}>
              Display name
              <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} style={inp(tokens)} placeholder="Full name" />
            </label>
            <label style={{ fontSize: 12, fontWeight: 800, color: tokens.textStrong }}>
              Handle
              <input value={profile.handle} onChange={(e) => setProfile({ ...profile, handle: e.target.value })} style={inp(tokens)} placeholder="unique_handle" />
            </label>
            <label style={{ fontSize: 12, fontWeight: 800, color: tokens.textStrong }}>
              Program
              <input value={profile.program} onChange={(e) => setProfile({ ...profile, program: e.target.value })} style={inp(tokens)} placeholder="BS Computer Science" />
            </label>
          </div>
        )}

        {step === 2 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {TAG_CHOICES.map((tag) => {
              const on = subs.tags.some((t) => t.tag === tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTagSub(tag)}
                  style={{
                    textAlign: "left",
                    padding: "11px 12px",
                    borderRadius: 12,
                    border: `1px solid ${tokens.border}`,
                    background: on ? "linear-gradient(135deg, rgba(255,96,128,0.28), rgba(155,0,40,0.45))" : tokens.surfaceAlt,
                    color: tokens.text,
                    cursor: "pointer",
                    fontWeight: 850,
                  }}
                >
                  {on ? "✓ " : ""}Subscribe to #{tag}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          {step > 0 && (
            <button type="button" disabled={busy} onClick={() => setStep((s) => Math.max(0, s - 1))} style={btnGhost(tokens)}>
              Back
            </button>
          )}
          {step === 0 && (
            <button type="button" disabled={busy} onClick={() => setStep(1)} style={btnSolid(tokens)}>
              Continue
            </button>
          )}
          {step === 1 && (
            <button type="button" disabled={busy} onClick={nextFromProfile} style={btnSolid(tokens)}>
              {busy ? "Saving…" : "Next"}
            </button>
          )}
          {step === 2 && (
            <button type="button" disabled={busy} onClick={() => void finish()} style={btnSolid(tokens)}>
              {busy ? "Finishing…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function inp(tokens) {
  return {
    display: "block",
    marginTop: 6,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: `1px solid ${tokens.inputBorder}`,
    background: tokens.inputBg,
    color: tokens.text,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  };
}

function btnSolid(tokens) {
  return {
    border: `1px solid ${tokens.borderStrong}`,
    background: "linear-gradient(135deg, #c0002a, #8b0020)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 14,
  };
}

function btnGhost(tokens) {
  return {
    border: `1px solid ${tokens.border}`,
    background: tokens.surface,
    color: tokens.text,
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 14,
  };
}
