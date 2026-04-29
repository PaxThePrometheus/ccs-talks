"use client";

import { useEffect, useRef } from "react";
import { GSAP_CDN } from "../cdn";
import { THEME } from "../theme";
import { useScript } from "../useScript";

export function AboutScreen() {
  const gsapLoaded = useScript(GSAP_CDN);
  const headRef = useRef(null);
  const subRef = useRef(null);

  useEffect(() => {
    if (!gsapLoaded || typeof window === "undefined" || !window.gsap) return;
    const gsap = window.gsap;
    gsap.fromTo(headRef.current, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out" });
    gsap.fromTo(subRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.4 });
  }, [gsapLoaded]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", paddingTop: 68, textAlign: "center" }}>
      <div ref={headRef} style={{ opacity: 0 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", margin: "0 auto 2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
            <text x="50" y="65" textAnchor="middle" fill="white" fontSize="40" fontWeight="bold">
              ⚜
            </text>
          </svg>
        </div>
        <h1 style={{ fontWeight: 900, fontSize: "clamp(3rem, 8vw, 7rem)", color: THEME.colors.textStrong, letterSpacing: "-2px", margin: 0 }}>
          CCS Talks
        </h1>
      </div>
      <p ref={subRef} style={{ color: "rgba(240,220,220,0.55)", marginTop: 16, fontSize: 16, opacity: 0 }}>
        All rights reserved.
      </p>
      <div style={{ marginTop: "4rem", maxWidth: 600, padding: "0 2rem" }}>
        {[
          { title: "Our Community", body: "CCS Talks is the dedicated digital forum for students, faculty, and alumni of the OLFU College of Computer Studies. A space to discuss, collaborate, and connect." },
          { title: "Our Mission", body: "To foster a vibrant tech community within OLFU-CCS, empowering members to share knowledge, explore ideas, and build lasting connections." },
          { title: "Made by", body: "Misfits Creatives™ — a student creative collective dedicated to building meaningful digital experiences for the CCS community." },
        ].map(({ title, body }) => (
          <div key={title} style={{ background: THEME.colors.cardBg, border: `1px solid ${THEME.colors.cardBorder}`, borderRadius: THEME.radii.md, padding: "1.5rem", marginBottom: "1rem", textAlign: "left", backdropFilter: "blur(8px)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#f0e0e0", marginBottom: 6 }}>{title}</div>
            <div style={{ color: "rgba(240,220,220,0.65)", fontSize: 14, lineHeight: 1.6 }}>{body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

