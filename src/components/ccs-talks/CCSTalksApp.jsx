"use client";

import { useEffect, useState } from "react";
import { styles } from "./theme";
import { ThreeBackground } from "./components/ThreeBackground";
import { DynamicBlobs } from "./components/DynamicBlobs";
import { useLowPower } from "./useLowPower";
import { NavBar } from "./components/NavBar";
import { Sidebar } from "./components/Sidebar";
import { LandingScreen } from "./screens/LandingScreen";
import { AboutScreen } from "./screens/AboutScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { ForumScreen } from "./screens/ForumScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { ActivitiesScreen } from "./screens/ActivitiesScreen";
import { BookmarksScreen } from "./screens/BookmarksScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AnnouncementsScreen } from "./screens/AnnouncementsScreen";
import { TicketsScreen } from "./screens/TicketsScreen";
import { FriendsScreen } from "./screens/FriendsScreen";
import { SubscriptionsScreen } from "./screens/SubscriptionsScreen";
import { OnboardingModal } from "./ui/OnboardingModal";
import { AppStateProvider, useAppState } from "./state/AppState";

function CCSTalksAppInner() {
  const { page, setPage, prefs, tokens, isAuthed } = useAppState();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLowPower } = useLowPower();
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
  const isLanding = page === "landing" || page === "about";
  const isAuth = page === "login" || page === "register";
  // Forum is the only page that can be browsed without auth (read-only preview).
  // Everything else (profile/bookmarks/friends/etc) requires sign in.
  const guestAllowed = ["landing", "about", "login", "register", "forum", "search", "announcements", "tickets"];
  const requiresAuth = !isAuthed && !guestAllowed.includes(page);
  const hasSidebarShell = [
    "forum",
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
    if (requiresAuth) setPage("login");
  }, [requiresAuth, setPage]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.background = tokens.appBg;
    document.body.style.color = tokens.text;
  }, [tokens]);

  return (
    <div
      className={`ccs-app ${isLight ? "ccs-light" : "ccs-dark"}${isLowPower ? " ccs-low-power" : ""}`}
      style={{
        ...styles.root,
        background: tokens.appBg,
        color: tokens.text,
        fontSize: prefs.largerText ? 16.5 : 15,
      }}
    >
      {/* WebGL layer first, canvas blobs on top (same z-index) so the 2D pass stays visible. */}
      {!isLight && (
        <>
          <ThreeBackground active accent={isLight ? "#ff8aa3" : "#ff6080"} light={isLight} />
          <DynamicBlobs intensity={0.55} />
        </>
      )}
      {isLight && <ThreeBackground active accent={isLight ? "#ff8aa3" : "#ff6080"} light={isLight} />}
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
              activeKey={page}
              mobileOpen={sidebarOpen}
              onMobileClose={() => setSidebarOpen(false)}
            />
            {isForum && <ForumScreen readOnly={!isAuthed} onSignInPrompt={() => setPage("login")} />}
            {isAnnouncements && <AnnouncementsScreen />}
            {isTickets && <TicketsScreen onNeedSignIn={() => setPage("login")} />}
            {isProfile && isAuthed && <ProfileScreen />}
            {isSearch && <SearchScreen />}
            {isActivities && isAuthed && <ActivitiesScreen />}
            {isBookmarks && isAuthed && <BookmarksScreen />}
            {isFriends && isAuthed && <FriendsScreen />}
            {isSubs && isAuthed && <SubscriptionsScreen />}
            {isSettings && isAuthed && <SettingsScreen />}
          </>
        ) : (
          <>
            <NavBar setPage={setPage} showFull={isLanding} />
            {page === "landing" && <LandingScreen setPage={setPage} />}
            {page === "about" && <AboutScreen />}
            {page === "login" && <AuthScreen mode="login" setPage={setPage} />}
            {page === "register" && <AuthScreen mode="register" setPage={setPage} />}
          </>
        )}
      </div>
      {(isLanding || isAuth) && (
        <div style={{ position: "fixed", bottom: "1.5rem", left: "2rem", zIndex: 2 }}>
          <span style={{ fontStyle: "italic", fontWeight: 800, fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }} />
        </div>
      )}
      <OnboardingModal open={isAuthed && prefs?.onboardingCompleted === false} />
    </div>
  );
}

export default function CCSTalksApp() {
  return (
    <AppStateProvider>
      <CCSTalksAppInner />
    </AppStateProvider>
  );
}

