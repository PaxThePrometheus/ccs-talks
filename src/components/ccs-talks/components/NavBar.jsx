"use client";

import { THEME } from "../theme";

export function NavBar({ setPage, showFull }) {
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
        padding: "0 2rem",
        height: 68,
        background: "rgba(40,0,14,0.6)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${THEME.colors.cardBorder}`,
      }}
    >
      <span
        onClick={() => setPage("landing")}
        style={{
          fontWeight: 800,
          fontSize: 20,
          color: "#fff",
          cursor: "pointer",
          letterSpacing: "-0.5px",
        }}
      >
        CCS Talks
      </span>

      {showFull && (
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {["About", "Forum", "Login/Register"].map((item) => (
            <span
              key={item}
              onClick={() => setPage(item === "Forum" ? "forum" : item === "About" ? "about" : "login")}
              style={{
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 500,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#fff")}
              onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.8)")}
            >
              {item}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setPage("landing")}
        style={{
          background: "rgba(20,0,8,0.85)",
          border: `1px solid ${THEME.colors.cardBorder}`,
          color: "#fff",
          padding: "8px 22px",
          borderRadius: THEME.radii.sm,
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Home
      </button>
    </nav>
  );
}

