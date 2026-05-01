"use client";

import { useState } from "react";
import { APP_CONFIG } from "../config/appConfig";
import { showToast } from "../state/toastBus";
import { useAppState } from "../state/AppState";

/**
 * Settings now ONLY hosts app-experience preferences.
 * Account, Privacy, Notifications, Security, Data have been moved to the
 * Account Center (opened from the Profile page). Operational/admin actions
 * live in the standalone Admin Console at /admin.
 */
export function SettingsScreen() {
  const { prefs, updatePrefs, toggleMode, tokens, setPage, isStaff, role } = useAppState();
  const isLight = prefs.mode === "light";
  const [tab, setTab] = useState("display");

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
        overflowX: "hidden",
        padding: "1.75rem 2rem 2.5rem",
        borderLeft: `1px solid ${tokens.divider}`,
        color: tokens.text,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", fontSize: 18 }}>{APP_CONFIG.routes.settings.title}</div>
            <div style={{ color: tokens.textMuted, fontSize: 13 }}>App-level preferences. Personal account settings live in the <strong>Account Center</strong> on your profile.</div>
          </div>
          <button onClick={() => setPage("profile")} style={btn(tokens, "ghost")}>↗ Open Account Center</button>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["display", "Display"],
            ["forum", "Forum"],
            ["accessibility", "Accessibility"],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={pill(tab === k, tokens, isLight)}>{label}</button>
          ))}
        </div>

        <div style={panel(tokens, isLight)}>
          {tab === "display" && (
            <Section title="Display" hint="Theme, density, and how the feed feels." tokens={tokens}>
              <Row label="Theme" tokens={tokens}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => updatePrefs({ mode: "dark" })} style={prefs.mode === "dark" ? btn(tokens, "solid") : btn(tokens, "ghost")}>🌙 Dark</button>
                  <button onClick={() => updatePrefs({ mode: "light" })} style={prefs.mode === "light" ? btn(tokens, "solid") : btn(tokens, "ghost")}>☀ Light</button>
                  <button onClick={toggleMode} style={btn(tokens, "ghost")}>Toggle</button>
                </div>
              </Row>
              <Row label="Compact mode" tokens={tokens}><Toggle checked={prefs.compact} onChange={(v) => updatePrefs({ compact: v })} /></Row>
              <Row label="Default feed sort" tokens={tokens}>
                <select style={inp(tokens, 160)} value={prefs.feedSort} onChange={(e) => updatePrefs({ feedSort: e.target.value })}>
                  <option value="latest">Latest</option><option value="top">Top</option><option value="mixed">Mixed</option>
                </select>
              </Row>
              <Row label="Default post tag" tokens={tokens}>
                <select style={inp(tokens, 160)} value={prefs.defaultPostTag} onChange={(e) => updatePrefs({ defaultPostTag: e.target.value })}>
                  <option>General</option><option>Academics</option><option>Tech</option><option>Events</option>
                </select>
              </Row>
            </Section>
          )}

          {tab === "forum" && (
            <Section title="Forum behavior" hint="Filtering and moderation defaults." tokens={tokens}>
              <Row label="Auto-hide reported posts after" tokens={tokens}>
                <select style={inp(tokens, 160)} value={prefs.hideReportedAfter} onChange={(e) => updatePrefs({ hideReportedAfter: Number(e.target.value) })}>
                  <option value={3}>3 reports</option><option value={5}>5 reports</option><option value={10}>10 reports</option>
                </select>
              </Row>
              <Row label="Show NSFW thumbnails" tokens={tokens}><Toggle checked={prefs.showSensitive} onChange={(v) => updatePrefs({ showSensitive: v })} /></Row>
              <Row label="Mark all subscriptions as read" tokens={tokens}>
                <button type="button" onClick={() => updatePrefs({ subsLastReadAt: Date.now() })} style={btn(tokens, "ghost")}>
                  Mark read
                </button>
              </Row>
              <Row label="Clear search history (this browser)" tokens={tokens}>
                <button type="button" onClick={clearSearchHistory} style={btn(tokens, "ghost")}>Clear</button>
              </Row>
            </Section>
          )}

          {tab === "accessibility" && (
            <Section title="Accessibility" hint="Calmer motion and easier reading." tokens={tokens}>
              <Row
                label="Simpler visuals (faster)"
                sub="Turns off animated lava/WebGL backdrop and heavier frosted glass. Keeps colors and typography."
                tokens={tokens}
              >
                <Toggle checked={prefs.reduceEffects} onChange={(v) => updatePrefs({ reduceEffects: v })} />
              </Row>
              <Row label="Reduce motion" tokens={tokens}><Toggle checked={prefs.reduceMotion} onChange={(v) => updatePrefs({ reduceMotion: v })} /></Row>
              <Row label="Larger text" tokens={tokens}><Toggle checked={prefs.largerText} onChange={(v) => updatePrefs({ largerText: v })} /></Row>
              <Row label="High contrast (preview)" tokens={tokens}><Toggle disabled hint="Coming soon" /></Row>
            </Section>
          )}
        </div>

        {isStaff && (
          <div style={{ ...panel(tokens, isLight), borderColor: isLight ? "rgba(192,0,42,0.30)" : "rgba(255,96,128,0.30)" }}>
            <Section title="Operations" hint="You are signed in with elevated privileges." tokens={tokens}>
              <Row label={`Open Admin Console (role · ${role})`} tokens={tokens}>
                <a href="/admin" style={{ ...btn(tokens, "solid"), textDecoration: "none" }}>↗ Open /admin</a>
              </Row>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, hint, warning, children, tokens }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.2px" }}>{title}</div>
        {warning && (
          <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 900, background: "rgba(255,180,80,0.16)", color: "#c47b00", border: "1px solid rgba(255,180,80,0.30)" }}>EXPERIMENTAL</span>
        )}
      </div>
      {hint && <div style={{ color: tokens.textMuted, fontSize: 12, marginTop: 4 }}>{hint}</div>}
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function Row({ label, sub, children, tokens }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: `1px solid ${tokens.divider}` }}>
      <div style={{ flex: "1 1 auto", minWidth: 140 }}>
        <div style={{ color: tokens.text, fontSize: 13, fontWeight: 750 }}>{label}</div>
        {sub ? <div style={{ color: tokens.textMuted, fontSize: 11.5, marginTop: 4, lineHeight: 1.35, maxWidth: 420 }}>{sub}</div> : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Toggle({ checked = false, disabled = false, hint, onChange }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange?.(!checked)} style={{ display: "inline-flex", alignItems: "center", gap: 10, opacity: disabled ? 0.55 : 1, background: "transparent", border: "none", cursor: disabled ? "not-allowed" : "pointer", padding: 0 }}>
      <span style={{ width: 44, height: 24, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: checked ? "linear-gradient(135deg, rgba(255,96,128,0.45), rgba(155,0,40,0.65))" : "rgba(255,255,255,0.10)", position: "relative", display: "inline-block" }}>
        <span style={{ width: 18, height: 18, borderRadius: 999, background: "rgba(255,255,255,0.95)", position: "absolute", top: 2.5, left: checked ? 22 : 4, transition: "left 0.18s" }} />
      </span>
      {hint && <span style={{ color: "rgba(160,140,140,0.85)", fontSize: 12 }}>{hint}</span>}
    </button>
  );
}

function panel(tokens, isLight) {
  return {
    marginTop: 12,
    borderRadius: 18,
    border: `1px solid ${tokens.cardBorder}`,
    background: tokens.cardBg,
    backdropFilter: "blur(14px)",
    padding: 16,
    boxShadow: isLight ? "0 12px 24px rgba(60,0,20,0.08)" : "0 18px 60px rgba(0,0,0,0.28)",
  };
}

function inp(tokens, width) {
  return { width: width || 220, boxSizing: "border-box", borderRadius: 12, border: `1px solid ${tokens.inputBorder}`, background: tokens.inputBg, color: tokens.text, padding: "8px 10px", outline: "none", fontSize: 13 };
}

function pill(active, tokens, isLight) {
  return {
    border: `1px solid ${tokens.border}`,
    background: active ? (isLight ? "rgba(60,0,20,0.10)" : "rgba(255,255,255,0.10)") : tokens.surfaceAlt,
    color: tokens.text,
    padding: "8px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: "-0.1px",
  };
}

function btn(tokens, kind) {
  if (kind === "solid") {
    return { border: `1px solid ${tokens.borderStrong}`, background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.65))", color: "#fff", padding: "9px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 850, fontSize: 13 };
  }
  return { border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.text, padding: "9px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 750, fontSize: 13 };
}
