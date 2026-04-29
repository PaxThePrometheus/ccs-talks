"use client";

import { THEME } from "../theme";

export function ProfileScreen() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 280,
        right: 0,
        bottom: 0,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "1.75rem 2rem 2.5rem",
        borderLeft: `1px solid ${THEME.colors.divider}`,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            padding: "16px 18px",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(80,0,26,0.45)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.30)",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(255,96,128,0.35), rgba(155,0,40,0.55))",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>Your Profile</div>
            <div style={{ marginTop: 2, color: "rgba(240,220,220,0.7)", fontSize: 13 }}>
              Profile page in progress — next we’ll design your header, stats, and posts grid.
            </div>
          </div>
          <button
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(20,0,8,0.55)",
              color: "#fff",
              padding: "9px 12px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 650,
              fontSize: 13,
              backdropFilter: "blur(10px)",
            }}
          >
            Edit
          </button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
          <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(30,0,12,0.55)", backdropFilter: "blur(14px)", padding: 16 }}>
            <div style={{ fontWeight: 750, color: "rgba(255,255,255,0.95)" }}>About</div>
            <div style={{ marginTop: 8, color: "rgba(240,220,220,0.72)", fontSize: 13, lineHeight: 1.6 }}>
              Add your bio, course/year, interests, and a “Pinned” section here.
            </div>
          </div>
          <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(30,0,12,0.55)", backdropFilter: "blur(14px)", padding: 16 }}>
            <div style={{ fontWeight: 750, color: "rgba(255,255,255,0.95)" }}>Stats</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { k: "Posts", v: "—" },
                { k: "Likes", v: "—" },
                { k: "Bookmarks", v: "—" },
              ].map((x) => (
                <div key={x.k} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(80,0,26,0.35)", padding: "10px 10px" }}>
                  <div style={{ fontSize: 12, color: "rgba(240,220,220,0.65)" }}>{x.k}</div>
                  <div style={{ marginTop: 2, fontWeight: 850, color: "#fff" }}>{x.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(30,0,12,0.55)", backdropFilter: "blur(14px)", padding: 16 }}>
          <div style={{ fontWeight: 750, color: "rgba(255,255,255,0.95)" }}>Recent activity</div>
          <div style={{ marginTop: 8, color: "rgba(240,220,220,0.70)", fontSize: 13 }}>
            Next: a list of your posts with the same card system as the forum.
          </div>
        </div>
      </div>
    </div>
  );
}

