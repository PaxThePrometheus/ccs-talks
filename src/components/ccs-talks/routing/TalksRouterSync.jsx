"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppState } from "../state/AppState";
import { buildTalksPathname, normalizeTalksPathname, parseTalksPathname } from "./talksPaths";

/**
 * Keeps virtual `page` state in sync with real URLs (`/forum`, `/profile/me`, `/login`, …),
 * parallel to `/admin` using the App Router — shareable routes without hash-only SPA links.
 */
export function TalksRouterSync() {
  const pathname = normalizeTalksPathname(usePathname() || "/");
  const router = useRouter();

  const lastPushedFullRef = useRef("");

  const {
    page,
    setPage,
    resetProfileVisit,
    fetchAndMergeVisitByHandle,
    setProfileVisitUserId,
    profileVisitUserId,
    profile,
    users,
    talksPathnameHydration,
  } = useAppState();

  // URL → React state (initial load, back/forward, external links).
  useEffect(() => {
    const searchSuffix = typeof window !== "undefined" ? window.location.search || "" : "";
    const fullCurrent = pathname + searchSuffix;

    if (lastPushedFullRef.current === fullCurrent) {
      lastPushedFullRef.current = "";
      return;
    }

    const { begin: beginHydration, end: endHydration } = talksPathnameHydration;
    let hydrateCompletesAsync = false;
    beginHydration();
    try {
      const parsed = parseTalksPathname(pathname);

      if (parsed.page === "profile" && parsed.profileHandle) {
        hydrateCompletesAsync = true;
        void fetchAndMergeVisitByHandle(parsed.profileHandle)
          .then((bundle) => {
            if (!bundle?.profile?.id) {
              router.replace("/" + searchSuffix, { scroll: false });
              return;
            }
            setProfileVisitUserId(String(bundle.profile.id));
            setPage("profile");
          })
          .catch(() => {
            router.replace("/" + searchSuffix, { scroll: false });
          })
          .finally(() => {
            endHydration();
          });
        return;
      }

      if (parsed.page === "profile" && parsed.selfProfile) {
        resetProfileVisit();
        setPage("profile");
        return;
      }

      resetProfileVisit();
      setPage(parsed.page);
    } finally {
      if (!hydrateCompletesAsync) endHydration();
    }
  }, [pathname, fetchAndMergeVisitByHandle, resetProfileVisit, router, setPage, setProfileVisitUserId, talksPathnameHydration]);

  // React state → URL after in-app navigations (`setPage` from sidebar etc.).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (talksPathnameHydration.shouldDeferTalksPush()) return;

    const built = buildTalksPathname({ page, profileVisitUserId, profile, users });
    if (built == null) return;

    const curPath = normalizeTalksPathname(window.location.pathname);
    const curSearch = window.location.search || "";

    const nextFull = `${built}${curSearch}`;
    const currentFull = `${curPath}${curSearch}`;

    if (nextFull === currentFull) return;

    lastPushedFullRef.current = nextFull;
    router.replace(nextFull, { scroll: false });
  }, [pathname, page, profileVisitUserId, profile, users, router, talksPathnameHydration]);

  // `#profile@x` / `#forum` legacy links → real paths once.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const migrateHash = () => {
      const raw = window.location.hash.replace(/^#/, "").trim();
      if (!raw) return;

      const profileMatch = /^profile@(.+)$/i.exec(raw);
      if (profileMatch) {
        let handle = profileMatch[1].trim();
        try {
          handle = decodeURIComponent(handle);
        } catch {
          /* ignore */
        }
        handle = handle.trim();
        if (!handle) return;
        const baseSearch = typeof window.location.search === "string" ? window.location.search : "";
        router.replace(`/profile/${encodeURIComponent(handle)}${baseSearch}`, { scroll: false });
        return;
      }

      const key = raw.split(/[/?]/)[0].toLowerCase();
      const simple =
        {
          forum: "/forum",
          home: "/forum",
          announcements: "/announcements",
          tickets: "/tickets",
          search: "/search",
          login: "/login",
          register: "/register",
          about: "/about",
          landing: "/",
        }[key] || null;
      if (simple) {
        const baseSearch = typeof window.location.search === "string" ? window.location.search : "";
        router.replace(simple + baseSearch, { scroll: false });
      }
    };

    migrateHash();
    window.addEventListener("hashchange", migrateHash);
    return () => window.removeEventListener("hashchange", migrateHash);
  }, [router]);

  return null;
}
