"use client";

import { useState } from "react";
import { APP_CONFIG } from "../config/appConfig";
import { THEME } from "../theme";
import { useAppState } from "../state/AppState";
import { ConfirmDialog } from "../ui/ConfirmDialog";

export function Sidebar({ setPage, activeKey = "forum", mobileOpen = false, onMobileClose }) {
  const navItems = APP_CONFIG.nav.sidebarPrimary;
  const bottom = APP_CONFIG.nav.sidebarSecondary;
  const { prefs, toggleMode, signOut, isAuthed, isStaff, role } = useAppState();
  const isLight = prefs.mode === "light";
  /** Show the link only when the server has confirmed the viewer is staff (admin/moderator). */
  const showAdmin = isAuthed && isStaff;
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleNav = (key) => {
    if (key === "landing") {
      // The "Sign out" item lives in sidebarSecondary with key=landing.
      // Open a confirmation step so the user doesn't lose their session by accident.
      if (isAuthed) {
        setConfirmSignOut(true);
        return;
      }
    }
    setPage(key);
    onMobileClose?.();
  };

  return (
    <div
      className={`ccs-sidebar${mobileOpen ? " is-open" : ""}`}
      style={{
        width: 280,
        height: "100vh",
        background: isLight ? "rgba(255,255,255,0.92)" : "rgba(30,0,12,0.92)",
        backdropFilter: "blur(12px)",
        borderRight: `1px solid ${isLight ? "rgba(60,0,20,0.14)" : THEME.colors.divider}`,
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 1.5rem 2rem",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 60,
        color: isLight ? "#2a0010" : "#f4ecec",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <span
          onClick={() => { setPage("landing"); onMobileClose?.(); }}
          title="Back to landing"
          style={{
            fontWeight: 900,
            fontSize: 22,
            color: isLight ? "#1a0008" : "#fff",
            letterSpacing: "-0.5px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          {APP_CONFIG.brand.name}
        </span>
        <button
          onClick={toggleMode}
          title="Toggle theme"
          style={{
            border: `1px solid ${isLight ? "rgba(60,0,20,0.18)" : "rgba(255,255,255,0.14)"}`,
            background: isLight ? "rgba(255,255,255,0.85)" : "rgba(20,0,8,0.55)",
            color: isLight ? "#2a0010" : "#fff",
            padding: "6px 10px",
            borderRadius: 999,
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {isLight ? "☀" : "🌙"}
        </button>
      </div>
      <div style={{ borderBottom: `1px solid ${isLight ? "rgba(60,0,20,0.10)" : THEME.colors.divider}`, marginBottom: "1.25rem" }} />

      <div style={{ flex: 1 }}>
        {navItems.map(({ icon, label, key }) => (
          <div
            key={key}
            onClick={() => handleNav(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              marginBottom: 2,
              background: key === activeKey
                ? (isLight ? "linear-gradient(90deg, rgba(192,0,42,0.18), rgba(192,0,42,0.04))" : "linear-gradient(90deg, rgba(160,0,40,0.55), rgba(160,0,40,0.15))")
                : "transparent",
              color: key === activeKey
                ? (isLight ? "#1a0008" : "#fff")
                : (isLight ? "rgba(60,0,20,0.78)" : "rgba(240,200,200,0.78)"),
              fontWeight: key === activeKey ? 700 : 500,
              fontSize: 15,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              if (key !== activeKey) e.currentTarget.style.background = isLight ? "rgba(60,0,20,0.06)" : "rgba(120,0,30,0.3)";
            }}
            onMouseLeave={(e) => {
              if (key !== activeKey) e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ fontSize: 16, width: 18, textAlign: "center" }}>{icon}</span> {label}
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${isLight ? "rgba(60,0,20,0.10)" : THEME.colors.divider}`, paddingTop: "1rem" }}>
        {bottom.map(({ icon, label, key }) => (
          <div
            key={key}
            onClick={() => handleNav(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              color: isLight ? "rgba(60,0,20,0.65)" : "rgba(240,200,200,0.65)",
              fontSize: 15,
              fontWeight: 500,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isLight ? "rgba(60,0,20,0.06)" : "rgba(120,0,30,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 16, width: 18, textAlign: "center" }}>{icon}</span> {label}
          </div>
        ))}

        {/* Admin Console: separate sub-app at /admin. Server-truth role gating. */}
        {showAdmin && (
          <a
            href="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              textDecoration: "none",
              cursor: "pointer",
              marginTop: 8,
              color: isLight ? "rgba(60,0,20,0.78)" : "rgba(240,200,200,0.78)",
              background: isLight ? "rgba(192,0,42,0.06)" : "rgba(160,0,40,0.18)",
              border: `1px solid ${isLight ? "rgba(192,0,42,0.18)" : "rgba(255,96,128,0.20)"}`,
              fontSize: 14,
              fontWeight: 700,
              transition: "background 0.2s",
            }}
            title={`Open the ${role} console (opens /admin)`}
          >
            <span style={{ fontSize: 16, width: 18, textAlign: "center" }}>🛡</span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span>Admin Console</span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: isLight ? "rgba(60,0,20,0.55)" : "rgba(240,200,200,0.55)" }}>
                role · {role}
              </span>
            </span>
          </a>
        )}
      </div>

      <span style={{ fontStyle: "italic", fontWeight: 800, fontSize: 11, color: isLight ? "rgba(60,0,20,0.35)" : "rgba(255,255,255,0.2)", marginTop: "1.5rem", letterSpacing: "1px" }}>
        GROUP 4™
      </span>

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out of CCS Talks?"
        body="You'll be returned to the landing page. Your draft posts and unsaved settings will be discarded."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        tone="warn"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={async () => {
          setConfirmSignOut(false);
          await signOut();
          setPage("landing");
        }}
      />
    </div>
  );
}
