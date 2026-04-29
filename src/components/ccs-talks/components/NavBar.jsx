"use client";

import { APP_CONFIG } from "../config/appConfig";
import { useAppState } from "../state/AppState";

export function NavBar({ setPage, showFull }) {
  const { tokens, prefs, isAuthed, toggleMode } = useAppState();
  const isLight = prefs.mode === "light";

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--ccs-shell-pad-x)",
        height: 68,
        background: isLight ? "rgba(255,255,255,0.78)" : "rgba(40,0,14,0.6)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${tokens.cardBorder}`,
        color: tokens.text,
        gap: 8,
      }}
    >
      <span
        onClick={() => setPage("landing")}
        style={{
          fontWeight: 950,
          fontSize: 20,
          color: tokens.textStrong,
          cursor: "pointer",
          letterSpacing: "-0.5px",
        }}
      >
        {APP_CONFIG.brand.name}
      </span>

      {showFull && (
        <div className="ccs-hide-mobile" style={{ display: "flex", gap: "1.6rem", alignItems: "center" }}>
          <span onClick={() => setPage("about")} style={{ color: tokens.textMuted, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>About</span>
          <span onClick={() => setPage("forum")} style={{ color: tokens.textMuted, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Browse forum</span>
          <span
            onClick={() => {
              setPage("landing");
              if (typeof window !== "undefined") {
                setTimeout(() => { try { window.__ccsScrollToCommunity && window.__ccsScrollToCommunity(); } catch {} }, 60);
              }
            }}
            style={{ color: tokens.textMuted, cursor: "pointer", fontSize: 14, fontWeight: 700 }}
          >
            Community
          </span>
        </div>
      )}

      <div suppressHydrationWarning style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={toggleMode}
          title="Toggle theme"
          style={{
            border: `1px solid ${tokens.border}`,
            background: tokens.surface,
            color: tokens.text,
            padding: "8px 10px",
            borderRadius: 999,
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 13,
          }}
        >
          {isLight ? "☀" : "🌙"}
        </button>
        {isAuthed ? (
          <button
            onClick={() => setPage("forum")}
            style={primary(tokens)}
          >
            Open forum
          </button>
        ) : (
          <>
            <button onClick={() => setPage("login")} style={ghost(tokens)}>Sign in</button>
            <button onClick={() => setPage("register")} style={primary(tokens)} className="ccs-hide-mobile">Create account</button>
          </>
        )}
      </div>
    </nav>
  );
}

function primary(tokens) {
  return {
    background: "linear-gradient(135deg, #c0002a, #8b0020)",
    border: `1px solid ${tokens.borderStrong}`,
    color: "#fff",
    padding: "9px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
  };
}
function ghost(tokens) {
  return {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    color: tokens.text,
    padding: "9px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 750,
    fontSize: 13,
  };
}
