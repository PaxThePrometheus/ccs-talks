"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GSAP_CDN } from "../cdn";
import { useScript } from "../useScript";
import { useAppState } from "../state/AppState";
import { APP_CONFIG } from "../config/appConfig";

export function AuthScreen({ mode, setPage }) {
  const gsapLoaded = useScript(GSAP_CDN);
  const cardRef = useRef(null);
  const { tokens, prefs, signIn } = useAppState();
  const isLight = prefs.mode === "light";
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!gsapLoaded || typeof window === "undefined" || !window.gsap || !cardRef.current) return;
    if (prefs.reduceMotion) { cardRef.current.style.opacity = "1"; return; }
    window.gsap.fromTo(cardRef.current, { opacity: 0, y: 28, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.2)" });
  }, [gsapLoaded, mode, prefs.reduceMotion]);

  // password strength scoring (0..4)
  const strength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);
  const strengthLabel = ["Too short", "Weak", "Okay", "Strong", "Excellent"][Math.max(0, Math.min(strength, 4))];
  const strengthColor = ["#a64646", "#c47b00", "#c9a000", "#3da55b", "#1e8a55"][Math.max(0, Math.min(strength, 4))];

  const validate = () => {
    setError("");
    if (!email || !/^[^\s@]+@[^\s@]+$/.test(email)) return "Please enter a valid email.";
    // Soft-gate to the university domains. We allow either student or faculty
    // address. Sign-in stays permissive so test accounts still work.
    if (!isLogin && !/@(student\.)?fatima\.edu\.ph$/i.test(email)) {
      return "Use your @student.fatima.edu.ph or @fatima.edu.ph email.";
    }
    if (!password) return "Please enter a password.";
    if (!isLogin) {
      if (!name.trim()) return "Please enter your full name.";
      if (password.length < 8) return "Password should be at least 8 characters.";
      if (password !== confirm) return "Passwords don't match.";
      if (!agree) return "Please agree to the Community Guidelines.";
    }
    return "";
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    // Mock auth — pretend network
    await new Promise((r) => setTimeout(r, 350));
    signIn(isLogin ? {} : { name: name.trim() });
    setSubmitting(false);
    setPage("forum");
  };

  return (
    <div className="ccs-stack-tablet" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", paddingTop: 68 }}>
      {/* Left: marketing copy. On tablet/mobile we stack and the marketing
          column is hidden to give the form full width. */}
      <aside className="ccs-hide-tablet" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "2rem 3rem", color: tokens.text }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", color: tokens.textMuted }}>{APP_CONFIG.brand.name.toUpperCase()}</div>
          <h1 style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 950, letterSpacing: "-1px", margin: "10px 0 14px", color: tokens.textStrong }}>
            {isLogin ? "Welcome back." : "Build your CCS profile."}
          </h1>
          <p style={{ fontSize: 16, color: tokens.textMuted, margin: 0, lineHeight: 1.55 }}>
            {isLogin
              ? "Pick up the conversation, reopen your bookmarks, and catch up on the threads you follow."
              : "Join the community: post threads, follow tags, drop into study circles, and message classmates."}
          </p>

          <ul style={{ marginTop: 22, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            <Bullet tokens={tokens}>🎓 Made for OLFU CCS students</Bullet>
            <Bullet tokens={tokens}>🔖 Bookmark threads, follow tags & people</Bullet>
            <Bullet tokens={tokens}>🛡 Real moderation tools for org leaders</Bullet>
            <Bullet tokens={tokens}>🌗 Dark & light, your call</Bullet>
          </ul>
        </div>
      </aside>

      {/* Right: card */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem 3rem" }}>
        <div
          ref={cardRef}
          style={{
            background: tokens.cardBg,
            border: `1px solid ${tokens.cardBorder}`,
            borderRadius: 18,
            padding: "1.75rem 1.75rem 1.5rem",
            width: "100%",
            maxWidth: 440,
            backdropFilter: "blur(16px)",
            opacity: 0,
            boxShadow: isLight ? "0 18px 40px rgba(60,0,20,0.10)" : "0 30px 70px rgba(0,0,0,0.35)",
            color: tokens.text,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", color: tokens.textMuted }}>{isLogin ? "SIGN IN" : "CREATE ACCOUNT"}</div>
            <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, border: `1px solid ${tokens.border}`, background: tokens.surfaceAlt }}>
              <button onClick={() => setPage("login")} style={tab(tokens, isLogin)}>Sign in</button>
              <button onClick={() => setPage("register")} style={tab(tokens, !isLogin)}>Sign up</button>
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 950, color: tokens.textStrong, letterSpacing: "-0.4px", marginTop: 10 }}>
            {isLogin ? "Sign in to CCS Talks" : "Create your CCS Talks account"}
          </div>
          <div style={{ fontSize: 13, color: tokens.textMuted, marginTop: 2 }}>
            {isLogin ? "Use your forum email and password." : "Takes about 30 seconds."}
          </div>

          {/* Mocked SSO row */}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={btn(tokens, "ghost")}>Continue with Google</button>
            <button style={btn(tokens, "ghost")}>Continue with Fatima SSO</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", color: tokens.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em" }}>
            <span style={{ flex: 1, height: 1, background: tokens.divider }} />OR<span style={{ flex: 1, height: 1, background: tokens.divider }} />
          </div>

          {!isLogin && (
            <Field label="Full name" tokens={tokens}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Juan Dela Cruz" style={inp(tokens)} />
            </Field>
          )}

          <Field label="School email" tokens={tokens}>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@student.fatima.edu.ph" style={inp(tokens)} />
            <div style={{ marginTop: 4, fontSize: 11, color: tokens.textSubtle }}>Use <b>@student.fatima.edu.ph</b> or <b>@fatima.edu.ph</b>.</div>
          </Field>

          <Field
            label={
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span>Password</span>
                {isLogin && <a onClick={() => alert("Password reset (mock)")} style={{ color: tokens.accent, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Forgot?</a>}
              </span>
            }
            tokens={tokens}
          >
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inp(tokens), paddingRight: 64 }} />
              <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 6, top: 6, padding: "6px 8px", border: "none", background: "transparent", color: tokens.textMuted, cursor: "pointer", fontWeight: 800, fontSize: 12 }}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            {!isLogin && password && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < strength ? strengthColor : tokens.divider }} />
                  ))}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: tokens.textMuted }}>{strengthLabel}</div>
              </div>
            )}
          </Field>

          {!isLogin && (
            <Field label="Confirm password" tokens={tokens}>
              <input type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inp(tokens)} />
            </Field>
          )}

          {!isLogin && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4, fontSize: 12, color: tokens.textMuted }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I agree to the <a style={{ color: tokens.accent, fontWeight: 800 }}>Community Guidelines</a> and the <a style={{ color: tokens.accent, fontWeight: 800 }}>Privacy notice</a>.</span>
            </label>
          )}

          {error && <div style={{ marginTop: 10, color: "#ff7d99", fontSize: 12, fontWeight: 800 }}>{error}</div>}

          <button
            onClick={submit}
            disabled={submitting}
            style={{
              width: "100%",
              marginTop: 14,
              background: "linear-gradient(135deg, #c0002a, #8b0020)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              padding: "13px",
              fontSize: 15,
              fontWeight: 900,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.8 : 1,
              letterSpacing: "-0.2px",
            }}
          >
            {submitting ? "…" : isLogin ? "Sign in" : "Create account"}
          </button>

          <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: tokens.textMuted }}>
            {isLogin ? "New to CCS Talks? " : "Already have an account? "}
            <span onClick={() => setPage(isLogin ? "register" : "login")} style={{ color: tokens.accent, cursor: "pointer", fontWeight: 800 }}>
              {isLogin ? "Create an account" : "Sign in"}
            </span>
          </p>

          <p style={{ textAlign: "center", marginTop: 6, fontSize: 12, color: tokens.textSubtle }}>
            <span onClick={() => setPage("forum")} style={{ cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>Continue as guest</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, tokens }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ color: tokens.text, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function Bullet({ children, tokens }) {
  return (
    <li style={{ display: "flex", gap: 10, alignItems: "center", color: tokens.textMuted, fontSize: 14 }}>
      <span style={{ width: 28, height: 28, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: tokens.surfaceAlt, border: `1px solid ${tokens.border}`, fontSize: 14 }}>{String(children).slice(0, 2)}</span>
      <span>{String(children).slice(2)}</span>
    </li>
  );
}

function inp(tokens) {
  return { width: "100%", boxSizing: "border-box", background: tokens.inputBg, border: `1px solid ${tokens.inputBorder}`, borderRadius: 12, padding: "11px 14px", color: tokens.text, fontSize: 14, outline: "none" };
}

function tab(tokens, active) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "none",
    background: active ? "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.55))" : "transparent",
    color: active ? "#fff" : tokens.text,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  };
}

function btn(tokens, kind) {
  if (kind === "solid") return { border: `1px solid ${tokens.borderStrong}`, background: "linear-gradient(135deg, rgba(255,96,128,0.30), rgba(155,0,40,0.65))", color: "#fff", padding: "10px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 850, fontSize: 13 };
  return { border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.text, padding: "10px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 750, fontSize: 13 };
}
