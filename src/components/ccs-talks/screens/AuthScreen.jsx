"use client";

import { useEffect, useRef, useState } from "react";
import { GSAP_CDN } from "../cdn";
import { THEME } from "../theme";
import { useScript } from "../useScript";

export function AuthScreen({ mode, setPage }) {
  const gsapLoaded = useScript(GSAP_CDN);
  const cardRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isLogin = mode === "login";

  useEffect(() => {
    if (!gsapLoaded || typeof window === "undefined" || !window.gsap) return;
    window.gsap.fromTo(cardRef.current, { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.3)" });
  }, [gsapLoaded, mode]);

  const handleSubmit = () => {
    if (email && password) setPage("forum");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 68 }}>
      <div
        ref={cardRef}
        style={{
          background: "rgba(60,0,20,0.75)",
          border: `1px solid rgba(180,60,80,0.3)`,
          borderRadius: THEME.radii.lg,
          padding: "2.5rem 2.5rem",
          width: "100%",
          maxWidth: 440,
          backdropFilter: "blur(16px)",
          opacity: 0,
          boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", color: "#f0e0e0", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: THEME.colors.inputBg,
              border: `1px solid rgba(255,255,255,0.06)`,
              borderRadius: THEME.radii.sm,
              padding: "12px 16px",
              color: "#fff",
              fontSize: 15,
              outline: "none",
              backdropFilter: "blur(10px)",
            }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", color: "#f0e0e0", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: THEME.colors.inputBg,
              border: `1px solid rgba(255,255,255,0.06)`,
              borderRadius: THEME.radii.sm,
              padding: "12px 16px",
              color: "#fff",
              fontSize: 15,
              outline: "none",
              backdropFilter: "blur(10px)",
            }}
          />
        </div>
        <div style={{ borderTop: `1px solid rgba(180,60,80,0.2)`, marginBottom: "1.2rem" }} />
        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #c0002a, #8b0020)",
            border: "none",
            borderRadius: THEME.radii.sm,
            color: "#fff",
            padding: "13px",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            transition: "opacity 0.2s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.transform = "scale(1.01)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isLogin ? "Sign In" : "Sign up"}
        </button>

        <p style={{ textAlign: "center", marginTop: "1.2rem", fontSize: 13, color: "rgba(240,200,200,0.55)" }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setPage(isLogin ? "register" : "login")} style={{ color: "#ff6080", cursor: "pointer", fontWeight: 600 }}>
            {isLogin ? "Sign up" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

