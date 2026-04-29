"use client";

import { useEffect, useRef } from "react";
import { GSAP_CDN } from "../cdn";
import { THEME } from "../theme";
import { useScript } from "../useScript";

export function LandingScreen({ setPage }) {
  const gsapLoaded = useScript(GSAP_CDN);
  const heroRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!gsapLoaded || typeof window === "undefined" || !window.gsap) return;
    const gsap = window.gsap;
    gsap.fromTo(heroRef.current, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out" });
    gsap.fromTo(subtitleRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.3, ease: "power2.out" });
    gsap.fromTo(ctaRef.current, { opacity: 0, y: 20, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, delay: 0.55, ease: "back.out(1.5)" });
    gsap.fromTo(scrollRef.current, { opacity: 0 }, { opacity: 0.5, duration: 1, delay: 1.2 });
    gsap.to(scrollRef.current, { y: 8, repeat: -1, yoyo: true, duration: 1.2, ease: "sine.inOut", delay: 1.5 });
  }, [gsapLoaded]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 5vw", paddingTop: 68, minHeight: "100vh" }}>
        <div style={{ flex: 1 }}>
          <h1
            ref={heroRef}
            style={{
              fontWeight: 900,
              fontSize: "clamp(3rem, 10vw, 9rem)",
              color: THEME.colors.textStrong,
              lineHeight: 0.92,
              letterSpacing: "-3px",
              margin: 0,
              opacity: 0,
            }}
          >
            CCS Talks
          </h1>
          <p ref={subtitleRef} style={{ color: THEME.colors.textMuted, fontSize: 17, marginTop: 20, opacity: 0 }}>
            The official forums site for the OLFU-CCS community.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 17, fontWeight: 500 }}>Start chatting.</p>
          <button
            ref={ctaRef}
            onClick={() => setPage("register")}
            style={{
              background: "rgba(20,0,8,0.75)",
              border: `1px solid rgba(200,100,120,0.3)`,
              color: "#fff",
              padding: "14px 32px",
              borderRadius: THEME.radii.md,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: 0,
              transition: "background 0.2s, transform 0.15s",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(40,0,16,0.9)";
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(20,0,8,0.75)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Join us.
          </button>
        </div>
      </div>

      <div style={{ padding: "2rem 5vw 1.5rem", borderTop: `1px solid ${THEME.colors.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontStyle: "italic", fontWeight: 800, fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: "1px" }}>
          MISFITS CREATIVES ™
        </span>
        <span ref={scrollRef} style={{ fontSize: 13, letterSpacing: "3px", color: "rgba(255,255,255,0.5)", opacity: 0 }}>
          SCROLL
        </span>
      </div>
    </div>
  );
}

