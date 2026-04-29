"use client";

import { useEffect, useState } from "react";
import { styles, THEME } from "./theme";
import { ThreeBackground } from "./components/ThreeBackground";
import { NavBar } from "./components/NavBar";
import { Sidebar } from "./components/Sidebar";
import { LandingScreen } from "./screens/LandingScreen";
import { AboutScreen } from "./screens/AboutScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { ForumScreen } from "./screens/ForumScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

export default function CCSTalksApp() {
  const [page, setPage] = useState("landing");
  const isForum = page === "forum";
  const isProfile = page === "profile";
  const isLanding = page === "landing" || page === "about";
  const isAuth = page === "login" || page === "register";
  const hasSidebarShell = isForum || isProfile;

  useEffect(() => {
    // keep: ensures body background matches app theme even if globals change
    if (typeof document === "undefined") return;
    document.body.style.background = THEME.colors.crimsonDark;
  }, []);

  return (
    <div style={styles.root}>
      <ThreeBackground active />
      <div style={styles.page}>
        {hasSidebarShell ? (
          <>
            <Sidebar setPage={setPage} activeKey={isProfile ? "profile" : "home"} />
            {isForum && <ForumScreen />}
            {isProfile && <ProfileScreen />}
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
          <span style={{ fontStyle: "italic", fontWeight: 800, fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>
            MISFITS CREATIVES ™
          </span>
        </div>
      )}
    </div>
  );
}

