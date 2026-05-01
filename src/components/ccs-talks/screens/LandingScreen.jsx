"use client";

import { useEffect, useRef } from "react";
import { GSAP_CDN } from "../cdn";
import { APP_CONFIG } from "../config/appConfig";
import { useAppState } from "../state/AppState";
import { useScript } from "../useScript";

export function LandingScreen({ setPage }) {
  const gsapLoaded = useScript(GSAP_CDN);
  const heroRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);
  const featureRefs = useRef([]);
  const stepRefs = useRef([]);
  const communityRef = useRef(null);
  const orgRefs = useRef([]);
  const { tokens, prefs, isAuthed, posts } = useAppState();
  const isLight = prefs.mode === "light";

  // expose scroll-to-community for the navbar
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__ccsScrollToCommunity = () => communityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => { try { delete window.__ccsScrollToCommunity; } catch {} };
  }, []);

  // Defensive: if GSAP somehow never resolves (CDN blocked, ad-blocker, slow
  // network, etc.) we still need every animated element to become visible.
  // Without this, the inline `opacity: 0` would leave the hero blank forever.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const t = setTimeout(() => {
      if (window.gsap) return; // animator will handle visibility
      const targets = [heroRef.current, subtitleRef.current, ctaRef.current, ...featureRefs.current, ...stepRefs.current, ...orgRefs.current];
      targets.forEach((el) => { if (el) el.style.opacity = "1"; });
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!gsapLoaded || typeof window === "undefined" || !window.gsap) return;
    if (prefs.reduceMotion) {
      [heroRef, subtitleRef, ctaRef, ...featureRefs.current.map((r) => ({ current: r })), ...stepRefs.current.map((r) => ({ current: r }))]
        .forEach((r) => { if (r.current) r.current.style.opacity = "1"; });
      return;
    }
    const gsap = window.gsap;
    // Apple-y bouncy: small overshoot, never overdone. We use `back.out(1.6)`
    // for the punchy feel and stagger so the cards land with a soft cascade.
    gsap.fromTo(heroRef.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.85, ease: "back.out(1.4)" });
    gsap.fromTo(subtitleRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.18, ease: "back.out(1.2)" });
    gsap.fromTo(ctaRef.current, { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.65, delay: 0.32, ease: "back.out(1.6)" });
    if (featureRefs.current.length) {
      gsap.fromTo(featureRefs.current, { opacity: 0, y: 22, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)", delay: 0.4, stagger: 0.08 });
    }
    if (stepRefs.current.length) {
      gsap.fromTo(stepRefs.current, { opacity: 0, y: 18, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.4)", delay: 0.6, stagger: 0.07 });
    }
    if (orgRefs.current.length) {
      gsap.fromTo(orgRefs.current, { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.5)", delay: 0.05, stagger: 0.05 });
    }
  }, [gsapLoaded, prefs.reduceMotion]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", color: tokens.text }}>
      {/* HERO */}
      <section style={{ padding: "100px 5vw 60px" }}>
        <div className="ccs-stack-tablet" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)", gap: 32, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.18em", color: tokens.textMuted }}>OLFU · COLLEGE OF COMPUTER STUDIES</div>
            <h1
              ref={heroRef}
              style={{
                fontWeight: 950,
                fontSize: "clamp(2.4rem, 9vw, 7.5rem)",
                color: tokens.textStrong,
                lineHeight: 0.95,
                letterSpacing: "-3px",
                margin: "10px 0 0",
                opacity: 0,
              }}
            >
              {APP_CONFIG.brand.name}
            </h1>
            <p ref={subtitleRef} style={{ color: tokens.textMuted, fontSize: 17, marginTop: 18, opacity: 0, maxWidth: 560, lineHeight: 1.6 }}>
              {APP_CONFIG.landing.heroSubtitle}
            </p>

            <div ref={ctaRef} style={{ marginTop: 26, display: "flex", gap: 10, flexWrap: "wrap", opacity: 0 }}>
              {isAuthed ? (
                <button onClick={() => setPage("forum")} style={btn(tokens, "solid", "lg")}>Open the forum →</button>
              ) : (
                <>
                  <button onClick={() => setPage("register")} style={btn(tokens, "solid", "lg")}>Create your account</button>
                  <button onClick={() => setPage("login")} style={btn(tokens, "ghost", "lg")}>I already have an account</button>
                </>
              )}
              <button onClick={() => setPage("forum")} style={{ ...btn(tokens, "ghost", "lg"), background: "transparent", borderColor: tokens.border }}>Browse as guest</button>
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {APP_CONFIG.landing.stats.map((s) => (
                <Stat key={s.k} k={s.k} v={s.v} tokens={tokens} />
              ))}
              <Stat k="Posts published" v={String(posts.length)} tokens={tokens} />
            </div>
          </div>

          {/* Right: Live preview card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: tokens.textMuted }}>LIVE · SAMPLE FEED</div>
              <button onClick={() => setPage("forum")} style={{ ...btn(tokens, "ghost"), padding: "6px 10px", fontSize: 12 }}>Peek →</button>
            </div>
            {posts.slice(0, 3).map((p, i) => (
              <PreviewCard key={p.id} post={p} tokens={tokens} isLight={isLight} delay={i} />
            ))}
            <div style={{ borderRadius: 14, border: `1px dashed ${tokens.cardBorder}`, padding: "12px 14px", color: tokens.textMuted, fontSize: 13, textAlign: "center", background: tokens.cardBg }}>
              {isAuthed ? "Open the forum to keep reading." : <><span onClick={() => setPage("login")} style={{ color: tokens.accent, fontWeight: 850, cursor: "pointer" }}>Sign in</span> to view all threads, post, and join the conversation.</>}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "10px 5vw 50px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {APP_CONFIG.landing.featureCards.map((c, i) => (
            <div
              key={c.title}
              ref={(el) => (featureRefs.current[i] = el)}
              style={{
                opacity: 0,
                borderRadius: 16,
                border: `1px solid ${tokens.cardBorder}`,
                background: tokens.cardBg,
                backdropFilter: "blur(12px)",
                padding: "14px 14px",
                boxShadow: isLight ? "0 12px 24px rgba(60,0,20,0.06)" : "0 16px 55px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ fontSize: 22 }}>{c.icon}</div>
              <div style={{ marginTop: 6, fontWeight: 900, color: tokens.textStrong, letterSpacing: "-0.2px" }}>{c.title}</div>
              <div style={{ marginTop: 4, color: tokens.textMuted, fontSize: 13, lineHeight: 1.55 }}>{c.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "10px 5vw 50px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: tokens.textMuted }}>HOW IT WORKS</div>
        <div className="ccs-stack-mobile" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          {[
            { n: "01", t: "Sign in with your CCS email", b: "Use your @student.fatima.edu.ph or @fatima.edu.ph address. Mods keep things kind." },
            { n: "02", t: "Subscribe to tags & people", b: "Follow #Academics or your favorite organizers — your feed stays focused." },
            { n: "03", t: "Post, message, organize", b: "Threads, study circles, event sign-ups, and bookmarks live in one place." },
          ].map((s, i) => (
            <div key={s.n} ref={(el) => (stepRefs.current[i] = el)} style={{ opacity: 0, borderRadius: 16, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, padding: 14, backdropFilter: "blur(12px)" }}>
              <div style={{ fontSize: 12, fontWeight: 950, color: tokens.accent, letterSpacing: "0.18em" }}>{s.n}</div>
              <div style={{ marginTop: 6, fontWeight: 900, color: tokens.textStrong, letterSpacing: "-0.2px" }}>{s.t}</div>
              <div style={{ marginTop: 4, color: tokens.textMuted, fontSize: 13, lineHeight: 1.55 }}>{s.b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMMUNITY (distinct from About) */}
      <section ref={communityRef} id="community" style={{ padding: "10px 5vw 50px", scrollMarginTop: 84 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: tokens.textMuted }}>COMMUNITY</div>
        <h2 style={{ margin: "6px 0 14px", fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.6px", fontSize: 28 }}>
          The orgs, events, and circles that make CCS, CCS.
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {APP_CONFIG.landing.community.orgs.map((o, i) => (
            <article
              key={o.name}
              ref={(el) => (orgRefs.current[i] = el)}
              style={{ opacity: 0, borderRadius: 16, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(12px)", padding: 14 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg, ${o.accent}, ${o.color})`, border: `1px solid ${tokens.border}` }} />
                <div>
                  <div style={{ fontWeight: 900, color: tokens.textStrong, letterSpacing: "-0.2px" }}>{o.name}</div>
                  <div style={{ color: tokens.textMuted, fontSize: 12 }}>{o.kind} · {o.members} members</div>
                </div>
              </div>
              <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 13, lineHeight: 1.55 }}>{o.body}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {o.tags.map((t) => (
                  <span key={t} style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999, color: tokens.text, background: tokens.surfaceAlt, border: `1px solid ${tokens.border}` }}>#{t}</span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 18, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: tokens.textMuted }}>UPCOMING</div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          {APP_CONFIG.landing.community.events.map((ev) => (
            <div key={ev.title} style={{ borderRadius: 14, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontWeight: 900, color: tokens.textStrong, letterSpacing: "-0.2px" }}>{ev.title}</div>
                <div style={{ color: tokens.accent, fontWeight: 900, fontSize: 12 }}>{ev.when}</div>
              </div>
              <div style={{ marginTop: 4, color: tokens.textMuted, fontSize: 13, lineHeight: 1.5 }}>{ev.body}</div>
              <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 12 }}>📍 {ev.where}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 16, border: `1px dashed ${tokens.cardBorder}`, background: tokens.cardBg, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, color: tokens.textStrong }}>Run an org or a circle?</div>
            <div style={{ color: tokens.textMuted, fontSize: 13 }}>Apply for an Organizer badge — get pinning, scheduled posts, and event boosts.</div>
          </div>
          <button onClick={() => setPage(isAuthed ? "forum" : "register")} style={btn(tokens, "solid")}>Apply</button>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 5vw 60px" }}>
        <div style={{ borderRadius: 22, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(14px)", padding: "26px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 950, color: tokens.textStrong, fontSize: 22, letterSpacing: "-0.4px" }}>Ready to join the conversation?</div>
            <div style={{ color: tokens.textMuted, fontSize: 13, marginTop: 4 }}>Free for any verified OLFU CCS student.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!isAuthed && <button onClick={() => setPage("register")} style={btn(tokens, "solid", "lg")}>Sign up</button>}
            <button onClick={() => setPage("forum")} style={btn(tokens, "ghost", "lg")}>{isAuthed ? "Open forum" : "Browse as guest"}</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "2rem 5vw 1.75rem", borderTop: `1px solid ${tokens.divider}` }}>
        <div className="ccs-stack-mobile" style={{ display: "grid", gridTemplateColumns: "1.2fr repeat(3, 1fr)", gap: 16, alignItems: "start" }}>
          <div>
            <div style={{ fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.3px" }}>{APP_CONFIG.brand.name}</div>
            <div style={{ marginTop: 8, color: tokens.textMuted, fontSize: 13, lineHeight: 1.6 }}>
              Built for CCS students — threads, resources, and campus life in one place.
            </div>
            <div style={{ marginTop: 12, color: tokens.textSubtle, fontStyle: "italic", fontWeight: 850, fontSize: 12, letterSpacing: "1px" }}>
              {APP_CONFIG.brand.org}
            </div>
          </div>
          {APP_CONFIG.landing.footer.columns.map((col) => (
            <div key={col.title}>
              <div style={{ color: tokens.text, fontWeight: 800, fontSize: 12, letterSpacing: "0.06em" }}>{col.title.toUpperCase()}</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {col.links.map((x) => (<div key={x} style={{ color: tokens.textMuted, fontSize: 13 }}>{x}</div>))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${tokens.divider}`, color: tokens.textSubtle, fontSize: 12 }}>{APP_CONFIG.landing.footer.copyright}</div>
      </footer>
    </div>
  );
}

function Stat({ k, v, tokens }) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(12px)", padding: "10px 14px", minWidth: 140 }}>
      <div style={{ color: tokens.textMuted, fontSize: 12, fontWeight: 700 }}>{k}</div>
      <div style={{ marginTop: 3, fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.3px", fontSize: 22 }}>{v}</div>
    </div>
  );
}

function PreviewCard({ post, tokens, isLight }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${tokens.cardBorder}`, background: tokens.cardBg, backdropFilter: "blur(12px)", padding: "12px 14px", boxShadow: isLight ? "0 10px 22px rgba(60,0,20,0.06)" : "0 14px 40px rgba(0,0,0,0.20)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: tokens.textMuted, fontSize: 12 }}>
        <span style={{ width: 24, height: 24, borderRadius: 999, background: "linear-gradient(135deg, #ff6080, #9b0028)", display: "inline-block" }} />
        <span style={{ color: tokens.textStrong, fontWeight: 800 }}>{post.avatar}</span>
        <span>· {post.time}</span>
        <span style={{ marginLeft: "auto", fontWeight: 800, color: tokens.text }}>{post.tag}</span>
      </div>
      <div style={{ marginTop: 8, color: tokens.text, fontSize: 14, lineHeight: 1.5 }}>{post.content}</div>
      <div style={{ marginTop: 10, color: tokens.textMuted, fontSize: 12 }}>♥ {post.likes} · 💬 {post.comments}</div>
    </div>
  );
}

function btn(tokens, kind, size) {
  const isLg = size === "lg";
  if (kind === "solid") {
    return {
      background: "linear-gradient(135deg, #c0002a, #8b0020)",
      border: `1px solid ${tokens.borderStrong}`,
      color: "#fff",
      padding: isLg ? "13px 18px" : "9px 12px",
      borderRadius: 14,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: isLg ? 15 : 13,
      letterSpacing: "-0.2px",
      boxShadow: "0 14px 30px rgba(155,0,40,0.30)",
    };
  }
  return {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    color: tokens.text,
    padding: isLg ? "13px 18px" : "9px 12px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: isLg ? 15 : 13,
    backdropFilter: "blur(8px)",
  };
}
