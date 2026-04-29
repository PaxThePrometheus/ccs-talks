"use client";

import { useEffect } from "react";
import { styles } from "./theme";
import { ThreeBackground } from "./components/ThreeBackground";
import { DynamicBlobs } from "./components/DynamicBlobs";
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
import { AdminScreen } from "./screens/AdminScreen";
import { FriendsScreen } from "./screens/FriendsScreen";
import { SubscriptionsScreen } from "./screens/SubscriptionsScreen";
import { SimpleFeatureScreen } from "./screens/SimpleFeatureScreen";
import { AppStateProvider, useAppState } from "./state/AppState";

function CCSTalksAppInner() {
  const { page, setPage, profile, prefs, tokens, isAuthed } = useAppState();
  const isForum = page === "forum";
  const isProfile = page === "profile";
  const isSearch = page === "search";
  const isActivities = page === "activities";
  const isBookmarks = page === "bookmarks";
  const isFriends = page === "friends";
  const isSubs = page === "subs";
  const isSettings = page === "settings";
  const isAdmin = page === "admin";
  const isLanding = page === "landing" || page === "about";
  const isAuth = page === "login" || page === "register";
  // Forum is the only page that can be browsed without auth (read-only preview).
  // Everything else (profile/bookmarks/friends/etc) requires sign in.
  const guestAllowed = ["landing", "about", "login", "register", "forum", "search"];
  const requiresAuth = !isAuthed && !guestAllowed.includes(page);
  const hasSidebarShell = ["forum", "profile", "search", "activities", "bookmarks", "friends", "subs", "settings", "admin"].includes(page);
  const showAdmin = profile.status === "Moderator" || profile.status === "Admin";
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
      className={`ccs-app ${isLight ? "ccs-light" : "ccs-dark"}`}
      style={{
        ...styles.root,
        background: tokens.appBg,
        color: tokens.text,
        fontSize: prefs.largerText ? 16.5 : 15,
      }}
    >
      {/* Backgrounds: lava-lamp shader + supporting canvas blobs (off in light) */}
      {!isLight && <DynamicBlobs intensity={0.55} />}
      <ThreeBackground active accent={isLight ? "#ff8aa3" : "#ff6080"} light={isLight} />
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
            <Sidebar setPage={setPage} activeKey={page} />
            {isForum && <ForumScreen readOnly={!isAuthed} onSignInPrompt={() => setPage("login")} />}
            {isProfile && isAuthed && <ProfileScreen />}
            {isSearch && <SearchScreen />}
            {isActivities && isAuthed && <ActivitiesScreen />}
            {isBookmarks && isAuthed && <BookmarksScreen />}
            {isFriends && isAuthed && <FriendsScreen />}
            {isSubs && isAuthed && <SubscriptionsScreen />}
            {isSettings && isAuthed && <SettingsScreen />}
            {isAdmin && showAdmin && isAuthed && <AdminScreen />}
            {isAdmin && (!showAdmin || !isAuthed) && <SimpleFeatureScreen title="Moderator / Admin" subtitle={isAuthed ? "This panel is available to Moderator/Admin roles (set it in Settings → Experimental → Role override)." : "Sign in to access moderation tools."} />}
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

