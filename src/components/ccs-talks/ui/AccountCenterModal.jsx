"use client";

import { useEffect, useRef, useState } from "react";
import * as api from "../api/ccsApi";
import { useAppState } from "../state/AppState";
import { ConfirmDialog } from "./ConfirmDialog";

const SECTIONS = [
  { key: "account", icon: "👤", label: "Account", hint: "Identity, profile, language" },
  { key: "privacy", icon: "🔐", label: "Privacy", hint: "Visibility, DMs, blocked users" },
  { key: "notifications", icon: "🔔", label: "Notifications", hint: "Mentions, replies, digest" },
  { key: "security", icon: "🛡", label: "Security", hint: "Password, 2FA, sessions" },
  { key: "data", icon: "🗂", label: "Your data", hint: "Export, delete, reset" },
];

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => resolve(r.result);
    r.readAsDataURL(file);
  });
}

export function AccountCenterModal({ open, onCancel }) {
  const { profile, prefs, updatePrefs, signOut, persistFullProfile, accountEmail } = useAppState();
  const [section, setSection] = useState("account");
  const [draft, setDraft] = useState(profile);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => { if (open) setDraft(profile); }, [open, profile]);

  if (!open) return null;

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const persist = async () => {
    await persistFullProfile(draft);
  };

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 540, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }} />
      <div
        className="ccs-account-modal"
        style={{
          position: "relative",
          width: "min(1020px, 96vw)",
          height: "min(720px, 88vh)",
          overflow: "hidden",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,0,8,0.82)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
          color: "#fff",
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gridTemplateRows: "1fr",
        }}
      >
        {/* Sidebar */}
        <aside className="ccs-scroll ccs-account-aside" style={{ borderRight: "1px solid rgba(255,255,255,0.10)", padding: 14, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: "-0.2px", padding: "8px 6px 12px" }}>Account Center</div>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid transparent",
                background: section === s.key ? "linear-gradient(90deg, rgba(160,0,40,0.55), rgba(160,0,40,0.10))" : "transparent",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>{s.label}</span>
                <span style={{ color: "rgba(240,220,220,0.55)", fontSize: 11 }}>{s.hint}</span>
              </span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => setConfirmSignOut(true)} style={btn("ghost")}>↩ Sign out</button>
        </aside>

        {/* Body — header is fixed, only the inner panel scrolls. */}
        <div style={{ display: "grid", gridTemplateRows: "auto 1fr", minHeight: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", flex: "0 0 auto" }}>
            <div style={{ fontWeight: 900, letterSpacing: "-0.2px" }}>{SECTIONS.find((s) => s.key === section)?.label}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onCancel} style={btn("ghost")}>Close</button>
              {section === "account" && <button onClick={persist} style={btn("solid")}>Save changes</button>}
            </div>
          </div>

          <div className="ccs-scroll" style={{ padding: 18, overflowY: "auto", minHeight: 0 }}>
            {section === "account" && (
              <Stack>
                <Group title="Identity">
                  <Field label="Display name"><input style={inp(280)} value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
                  <Field label="Handle"><input style={inp(280)} value={draft.handle} onChange={(e) => set("handle", e.target.value)} /></Field>
                  <Field label="Bio"><textarea rows={3} style={{ ...inp(420), height: 84 }} value={draft.bio} onChange={(e) => set("bio", e.target.value)} /></Field>
                  <Field label="Avatar (upload)">
                    <input ref={fileInput} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 4 * 1024 * 1024) { alert("Image too large (>4MB)"); return; } set("avatarImage", await readFileAsDataURL(f)); }} />
                    <button onClick={() => fileInput.current?.click()} style={btn("ghost")}>Upload image…</button>
                    {draft.avatarImage && <button onClick={() => set("avatarImage", "")} style={btn("ghost")}>Remove</button>}
                  </Field>
                </Group>

                <Group title="School">
                  <Field label="University"><input style={inp(280)} value={draft.university} onChange={(e) => set("university", e.target.value)} /></Field>
                  <Field label="College"><input style={inp(280)} value={draft.college} onChange={(e) => set("college", e.target.value)} /></Field>
                  <Field label="Program"><input style={inp(280)} value={draft.program} onChange={(e) => set("program", e.target.value)} /></Field>
                  <Field label="Year"><input style={inp(160)} value={draft.year} onChange={(e) => set("year", e.target.value)} /></Field>
                  <Field label="Campus"><input style={inp(180)} value={draft.campus} onChange={(e) => set("campus", e.target.value)} /></Field>
                </Group>

                <Group title="Locale">
                  <Field label="Language">
                    <select style={inp(180)} value={prefs.language} onChange={(e) => updatePrefs({ language: e.target.value })}>
                      <option>English</option><option>Filipino</option><option>Tagalog</option>
                    </select>
                  </Field>
                  <Field label="School email (verified at sign-up)">
                    <input style={{ ...inp(280), opacity: 0.85, cursor: "not-allowed" }} readOnly value={accountEmail || "—"} />
                  </Field>
                </Group>
              </Stack>
            )}

            {section === "privacy" && (
              <Stack>
                <Group title="Who can see your profile">
                  <Field label="Profile visibility">
                    <select style={inp(180)} value={prefs.profileVisibility} onChange={(e) => updatePrefs({ profileVisibility: e.target.value })}>
                      <option>Public</option><option>Friends</option><option>Private</option>
                    </select>
                  </Field>
                  <Field label="Show online status"><Toggle checked={prefs.showOnlineStatus} onChange={(v) => updatePrefs({ showOnlineStatus: v })} /></Field>
                </Group>
                <Group title="Messaging">
                  <Field label="Direct messages">
                    <select style={inp(180)} value={prefs.allowDMs} onChange={(e) => updatePrefs({ allowDMs: e.target.value })}>
                      <option>Everyone</option><option>Friends</option><option>None</option>
                    </select>
                  </Field>
                </Group>
                <Group title="Content">
                  <Field label="Allow sensitive content"><Toggle checked={prefs.showSensitive} onChange={(v) => updatePrefs({ showSensitive: v })} /></Field>
                  <Field label="Block list"><button style={btn("ghost")}>Manage…</button></Field>
                </Group>
              </Stack>
            )}

            {section === "notifications" && (
              <Stack>
                <Group title="Activity">
                  <Field label="Mentions"><Toggle checked={prefs.notifyMentions} onChange={(v) => updatePrefs({ notifyMentions: v })} /></Field>
                  <Field label="Replies"><Toggle checked={prefs.notifyReplies} onChange={(v) => updatePrefs({ notifyReplies: v })} /></Field>
                  <Field label="Friend requests"><Toggle checked={prefs.notifyFriendRequests} onChange={(v) => updatePrefs({ notifyFriendRequests: v })} /></Field>
                </Group>
                <Group title="Subscriptions & email">
                  <Field label="Subscription updates"><Toggle checked={prefs.notifySubscriptions} onChange={(v) => updatePrefs({ notifySubscriptions: v })} /></Field>
                  <Field label="Weekly digest"><Toggle checked={prefs.notifyDigest} onChange={(v) => updatePrefs({ notifyDigest: v })} /></Field>
                </Group>
              </Stack>
            )}

            {section === "security" && (
              <Stack>
                <Group title="Password">
                  <Field label="Current password"><input type="password" style={inp(280)} /></Field>
                  <Field label="New password"><input type="password" style={inp(280)} /></Field>
                  <Field label="Confirm new password"><input type="password" style={inp(280)} /></Field>
                  <button style={btn("solid")}>Update password</button>
                </Group>
                <Group title="Two-factor authentication">
                  <Field label="Authenticator app"><Toggle /></Field>
                  <Field label="Backup codes"><button style={btn("ghost")}>Generate</button></Field>
                </Group>
                <Group title="Active sessions">
                  {[
                    { name: "This browser", where: "Antipolo, PH", current: true },
                    { name: "Pixel 8 (Chrome)", where: "Manila, PH", current: false },
                    { name: "CCS Lab PC #14", where: "OLFU Antipolo", current: false },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{s.name}{s.current ? " · current" : ""}</div>
                        <div style={{ color: "rgba(240,220,220,0.6)", fontSize: 12 }}>{s.where}</div>
                      </div>
                      {!s.current && <button style={btn("ghost")}>Sign out</button>}
                    </div>
                  ))}
                  <button style={btn("ghost")}>Sign out everywhere</button>
                </Group>
              </Stack>
            )}

            {section === "data" && (
              <Stack>
                <Group title="Export">
                  <Field label="Download a copy of your data"><button style={btn("ghost")}>Request export</button></Field>
                </Group>
                <Group title="Reset">
                  <Field label="Clear local cache (posts, comments, friends, subs)">
                    <button onClick={() => { if (typeof window === "undefined") return; ["ccs.posts.v1", "ccs.comments.v1", "ccs.activities.v1", "ccs.friends.v1", "ccs.subs.v1", "ccs.reports.v1"].forEach((k) => window.localStorage.removeItem(k)); window.location.reload(); }} style={btn("ghost")}>Clear & reload</button>
                  </Field>
                  <Field label="Run welcome flow again">
                    <button
                      onClick={async () => {
                        try {
                          await api.patchAccount({ prefs: { ...prefs, onboardingCompleted: false } });
                          updatePrefs({ onboardingCompleted: false });
                        } catch {
                          window.alert("Could not reset onboarding. Check your connection.");
                        }
                      }}
                      style={btn("ghost")}
                    >
                      Replay onboarding
                    </button>
                  </Field>
                </Group>
                <Group title="Danger zone" tone="warn">
                  <Field label="Delete account">
                    <button style={{ ...btn("ghost"), color: "#ff7d99", borderColor: "rgba(255,125,153,0.40)" }}>Delete…</button>
                  </Field>
                </Group>
              </Stack>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out of CCS Talks?"
        body="You'll be returned to the landing page. Your draft posts and unsaved settings will be discarded."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        tone="warn"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setConfirmSignOut(false);
          signOut();
          onCancel?.();
        }}
      />
    </div>
  );
}

function Stack({ children }) { return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>; }
function Group({ title, tone, children }) {
  return (
    <section style={{ borderRadius: 14, border: `1px solid ${tone === "warn" ? "rgba(255,125,153,0.30)" : "rgba(255,255,255,0.10)"}`, background: "rgba(30,0,12,0.55)", padding: 14 }}>
      <div style={{ fontWeight: 900, color: tone === "warn" ? "#ff9eb1" : "#fff", letterSpacing: "-0.2px", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </section>
  );
}
function Field({ label, children }) {
  return (
    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ color: "rgba(240,220,220,0.85)", fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{children}</div>
    </label>
  );
}
function Toggle({ checked = false, onChange }) {
  return (
    <button type="button" onClick={() => onChange?.(!checked)} style={{ display: "inline-flex", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
      <span style={{ width: 44, height: 24, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: checked ? "linear-gradient(135deg, rgba(255,96,128,0.45), rgba(155,0,40,0.65))" : "rgba(255,255,255,0.06)", position: "relative", display: "inline-block" }}>
        <span style={{ width: 18, height: 18, borderRadius: 999, background: "rgba(255,255,255,0.92)", position: "absolute", top: 2.5, left: checked ? 22 : 4, transition: "left 0.18s" }} />
      </span>
    </button>
  );
}
function inp(w) {
  return { width: w || 220, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.22)", color: "#fff", padding: "8px 10px", outline: "none", fontSize: 13 };
}
function btn(kind) {
  if (kind === "solid") return { border: "1px solid rgba(255,255,255,0.14)", background: "linear-gradient(135deg, rgba(255,96,128,0.28), rgba(155,0,40,0.55))", color: "#fff", padding: "9px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 850, fontSize: 13 };
  return { border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.88)", padding: "9px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 750, fontSize: 13 };
}
