"use client";

import { THEME } from "../theme";

export function Sidebar({ setPage, activeKey = "home" }) {
  const navItems = [
    { icon: "🏠", label: "Home", key: "home" },
    { icon: "👤", label: "Profile", key: "profile" },
    { icon: "🔖", label: "Bookmarks", key: "bookmarks" },
    { icon: "👥", label: "Friends", key: "friends" },
    { icon: "＋", label: "Subscriptions", key: "subs" },
  ];
  const bottom = [
    { icon: "⚙️", label: "Settings", key: "settings" },
    { icon: "↩", label: "Sign out", key: "signout" },
  ];

  return (
    <div
      style={{
        width: 280,
        minHeight: "100vh",
        background: "rgba(30,0,12,0.7)",
        backdropFilter: "blur(12px)",
        borderRight: `1px solid ${THEME.colors.divider}`,
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 1.5rem 2rem",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
      }}
    >
      <span style={{ fontWeight: 900, fontSize: 22, color: "#fff", letterSpacing: "-0.5px", marginBottom: "1.25rem" }}>
        CCS Talks
      </span>
      <div style={{ borderBottom: `1px solid ${THEME.colors.divider}`, marginBottom: "1.25rem" }} />

      <div style={{ flex: 1 }}>
        {navItems.map(({ icon, label, key }) => (
          <div
            key={key}
            onClick={() => {
              if (key === "home") setPage("forum");
              else if (key === "profile") setPage("profile");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              marginBottom: 2,
              background: key === activeKey ? "linear-gradient(90deg, rgba(160,0,40,0.55), rgba(160,0,40,0.15))" : "transparent",
              color: key === activeKey ? "#fff" : "rgba(240,200,200,0.78)",
              fontWeight: key === activeKey ? 700 : 500,
              fontSize: 15,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              if (key !== activeKey) e.currentTarget.style.background = "rgba(120,0,30,0.3)";
            }}
            onMouseLeave={(e) => {
              if (key !== activeKey) e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ fontSize: 16, width: 18, textAlign: "center" }}>{icon}</span> {label}
          </div>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${THEME.colors.divider}`, paddingTop: "1rem" }}>
        {bottom.map(({ icon, label, key }) => (
          <div
            key={key}
            onClick={() => (key === "signout" ? setPage("landing") : null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              color: "rgba(240,200,200,0.65)",
              fontSize: 15,
              fontWeight: 500,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(120,0,30,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 16, width: 18, textAlign: "center" }}>{icon}</span> {label}
          </div>
        ))}
      </div>

      <span style={{ fontStyle: "italic", fontWeight: 800, fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: "1.5rem", letterSpacing: "1px" }}>
        MISFITS CREATIVES ™
      </span>
    </div>
  );
}

