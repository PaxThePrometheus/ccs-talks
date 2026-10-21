"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { styles } from "./theme";
import { StaticBackdrop } from "./components/StaticBackdrop";
import { ThreeBackground } from "./components/ThreeBackground";
import { DynamicBlobs } from "./components/DynamicBlobs";
import { useLowPower } from "./useLowPower";
import { NavBar } from "./components/NavBar";
import { Sidebar } from "./components/Sidebar";
import { LandingScreen } from "./screens/LandingScreen";
const AboutScreen = lazy(() => import("./screens/AboutScreen").then(m => ({ default: m.AboutScreen })));
const AuthScreen = lazy(() => import("./screens/AuthScreen").then(m => ({ default: m.AuthScreen })));
const ForgotPasswordScreen = lazy(() => import("./screens/ForgotPasswordScreen").then(m => ({ default: m.ForgotPasswordScreen })));
const ResetPasswordScreen = lazy(() => import("./screens/ResetPasswordScreen").then(m => ({ default: m.ResetPasswordScreen })));
const ForumScreen = lazy(() => import("./screens/ForumScreen").then(m => ({ default: m.ForumScreen })));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen").then(m => ({ default: m.ProfileScreen })));
const SearchScreen = lazy(() => import("./screens/SearchScreen").then(m => ({ default: m.SearchScreen })));
const ActivitiesScreen = lazy(() => import("./screens/ActivitiesScreen").then(m => ({ default: m.ActivitiesScreen })));
const BookmarksScreen = lazy(() => import("./screens/BookmarksScreen").then(m => ({ default: m.BookmarksScreen })));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen").then(m => ({ default: m.SettingsScreen })));
const AnnouncementsScreen = lazy(() => import("./screens/AnnouncementsScreen").then(m => ({ default: m.AnnouncementsScreen })));
const TicketsScreen = lazy(() => import("./screens/TicketsScreen").then(m => ({ default: m.TicketsScreen })));
const FriendsScreen = lazy(() => import("./screens/FriendsScreen").then(m => ({ default: m.FriendsScreen })));
const SubscriptionsScreen = lazy(() => import("./screens/SubscriptionsScreen").then(m => ({ default: m.SubscriptionsScreen })));
const PostDetailScreen = lazy(() => import("./screens/PostDetailScreen").then(m => ({ default: m.PostDetailScreen })));
const OnboardingModal = lazy(() => import("./ui/OnboardingModal").then(m => ({ default: m.OnboardingModal })));
import { AppStateProvider, useAppState } from "./state/AppState";
import { TalksRouterSync } from "./routing/TalksRouterSync";
import { ToastHost } from "./ui/ToastHost";

function CCSTalksAppInner() {
  const { page, setPage, prefs, tokens, isAuthed, authReady, accountReady, profileVisitUserId, profileNotFoundHandle, profileRouteLoading, profileRouteError, activePostId } = useAppState();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLowPower } = useLowPower();
  /** Animated WebGL/canvas backgrounds + maximal glass polish off — keeps layout/colors intact. */
  const saveGpu = !!(prefs.reduceEffects || prefs.reduceMotion || isLowPower);
  const isForum = page === "forum";
  const isProfile = page === "profile";
  const isSearch = page === "search";
  const isActivities = page === "activities";
  const isBookmarks = page === "bookmarks";
  const isFriends = page === "friends";
  const isSubs = page === "subs";
  const isSettings = page === "settings";
  const isAnnouncements = page === "announcements";
  const isTickets = page === "tickets";
  const isPost = page === "post";
  const isLanding = page === "landing" || page === "about";
  const isAuth = page === "login" || page === "register" || page === "forgot-password" || page === "reset-password";
  // Forum is the only page that can be browsed without auth (read-only preview).
  // Everything else (profile/bookmarks/friends/etc) requires sign in.
  const guestAllowed = [
    "landing",
    "about",
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "forum",
    "post",
    "search",
    "announcements",
    "tickets",
  ];
  /** Signed-out users aren't forced to login on /profile route; peek flow uses `profileVisitUserId`. */
  const guestOnProfileRoute = page === "profile" && !!(profileRouteLoading || profileVisitUserId || profileNotFoundHandle || profileRouteError);
  const requiresAuth = !isAuthed && !guestAllowed.includes(page) && !guestOnProfileRoute;
  const hasSidebarShell = [
    "forum",
    "post",
    "announcements",
    "tickets",
    "profile",
    "search",
    "activities",
    "bookmarks",
    "friends",
    "subs",
    "settings",
  ].includes(page);
  const isLight = prefs.mode === "light";

  useEffect(() => {
    if (authReady && requiresAuth) setPage("login", { replace: true });
  }, [authReady, requiresAuth, setPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const tok = new URLSearchParams(window.location.search).get("reset");
      if (tok && window.location.pathname !== "/reset-password") {
        window.history.replaceState(null, "", `/reset-password?reset=${encodeURIComponent(tok)}`);
      }
    } catch {
      /* ignore */
    }
    /* One-shot bootstrap from (?reset=) link; avoids re-routing later when `setPage` identity changes. */
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.background = tokens.appBg;
    document.body.style.color = tokens.text;
  }, [tokens]);

  const accentWarm = isLight ? "#ff8aa3" : "#ff6080";

  return (
    <div
      className={`ccs-app ccs-efficient ${isLight ? "ccs-light" : "ccs-dark"}${saveGpu ? " ccs-low-power" : ""}`}
      data-ccs-page={page}
      style={{
        ...styles.root,
        background: tokens.appBg,
        color: tokens.text,
        fontSize: prefs.largerText ? 16.5 : 15,
      }}
    >
      {/* Background layers: animated stack vs cheap CSS radial wash. */}
      {saveGpu ? (
        <StaticBackdrop accent={accentWarm} light={isLight} />
      ) : (
        <>
          {!isLight && (
            <>
              <ThreeBackground active accent={accentWarm} light={isLight} />
              <DynamicBlobs intensity={0.52} />
            </>
          )}
          {isLight && <ThreeBackground active accent={accentWarm} light={isLight} />}
          {isLight && (
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 0,
                pointerEvents: "none",
                background: "rgba(255,245,247,0.45)",
              }}
            />
          )}
        </>
      )}
      <div style={styles.page}>
        {hasSidebarShell ? (
          <>
            {/* Mobile-only hamburger; the CSS handles when it shows. */}
            <button
              type="button"
              aria-label="Open menu"
              className="ccs-hamburger"
              onClick={() => setSidebarOpen(true)}
              style={{
                background: tokens.surface,
                border: `1px solid ${tokens.border}`,
                color: tokens.text,
              }}
            >
              ☰
            </button>
            {/* Backdrop renders only when drawer is open on mobile. */}
            <div
              className={`ccs-sidebar-backdrop${sidebarOpen ? " is-open" : ""}`}
              onClick={() => setSidebarOpen(false)}
            />
            <Sidebar
              setPage={setPage}
              activeKey={isPost ? "forum" : page}
              mobileOpen={sidebarOpen}
              onMobileClose={() => setSidebarOpen(false)}
            />
            <Suspense fallback={<div role="status" style={{ marginLeft: "var(--ccs-shell-left)", padding: "3rem", color: tokens.text }}>Loading…</div>}>
            {isForum && <ForumScreen readOnly={!isAuthed} onSignInPrompt={() => setPage("login")} />}
            {isPost && <PostDetailScreen key={activePostId} readOnly={!isAuthed} onSignInPrompt={() => setPage("login")} />}
            {isAnnouncements && <AnnouncementsScreen />}
            {isTickets && <TicketsScreen onNeedSignIn={() => setPage("login")} />}
            {isProfile && profileRouteLoading && <div role="status" style={{ marginLeft: "var(--ccs-shell-left)", padding: "3rem" }}>Loading profile…</div>}
            {isProfile && !profileRouteLoading && profileRouteError && <div role="alert" style={{ marginLeft: "var(--ccs-shell-left)", padding: "3rem" }}>{profileRouteError} <button onClick={() => window.location.reload()}>Reload profile</button></div>}
            {isProfile && !profileRouteLoading && !profileRouteError && (isAuthed || String(profileVisitUserId || "").trim() || profileNotFoundHandle) && <ProfileScreen key={profileVisitUserId || "self"} />}
            {requiresAuth && !authReady && <div role="status" style={{ marginLeft: "var(--ccs-shell-left)", padding: "3rem" }}>Checking your session…</div>}
            {isSearch && <SearchScreen />}
            {isActivities && isAuthed && <ActivitiesScreen />}
            {isBookmarks && isAuthed && <BookmarksScreen />}
            {isFriends && isAuthed && <FriendsScreen />}
            {isSubs && isAuthed && <SubscriptionsScreen />}
            {isSettings && isAuthed && <SettingsScreen />}
            </Suspense>
          </>
        ) : (
          <>
            <NavBar setPage={setPage} showFull={isLanding} />
            <Suspense fallback={<div role="status" style={{ padding: "6rem 3rem", color: tokens.text }}>Loading…</div>}>
            {page === "landing" && <LandingScreen setPage={setPage} />}
            {page === "about" && <AboutScreen />}
            {page === "login" && <AuthScreen mode="login" setPage={setPage} />}
            {page === "register" && <AuthScreen mode="register" setPage={setPage} />}
            {page === "forgot-password" && <ForgotPasswordScreen setPage={setPage} />}
            {page === "reset-password" && <ResetPasswordScreen setPage={setPage} />}
            </Suspense>
          </>
        )}
      </div>
      {(isLanding || isAuth) && (
        <div style={{ position: "fixed", bottom: "1.5rem", left: "2rem", zIndex: 2 }}>
          <span style={{ fontStyle: "italic", fontWeight: 800, fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }} />
        </div>
      )}
      {isAuthed && accountReady && prefs?.onboardingCompleted === false && <Suspense fallback={null}><OnboardingModal open /></Suspense>}
    </div>
  );
}

export default function CCSTalksApp() {
  return (
    <AppStateProvider>
      <ToastHost />
      <TalksRouterSync />
      <CCSTalksAppInner />
    </AppStateProvider>
  );
}

