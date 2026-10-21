"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppState } from "../state/AppState";
import { parseTalksPathname } from "./talksPaths";
import { navigateTalks } from "./navigateTalks";

/** The URL selects the screen synchronously. Effects only load its data; they
 * never write an old screen back into history after Back/Forward. */
export function TalksRouterSync() {
  const pathname = usePathname() || "/";
  const {
    resetProfileVisit, fetchAndMergeVisitByHandle, setProfileVisitUserId,
    setProfileNotFoundHandle, setResolvedProfileHandle, setProfileRouteError,
    hydratePostFromServer,
  } = useAppState();

  useEffect(() => {
    let cancelled = false;
    const parsed = parseTalksPathname(pathname);
    resetProfileVisit();
    setProfileRouteError("");
    if (parsed.page === "post" && parsed.postId) {
      void hydratePostFromServer(parsed.postId, () => !cancelled);
    }
    if (parsed.page === "profile" && parsed.profileHandle) {
      const handle = parsed.profileHandle;
      void fetchAndMergeVisitByHandle(handle, () => !cancelled).then(bundle => {
        if (cancelled) return;
        if (bundle?.profile?.id) setProfileVisitUserId(String(bundle.profile.id));
        else setProfileNotFoundHandle(handle);
      }).catch(error => {
        if (cancelled) return;
        if (error?.status === 404) setProfileNotFoundHandle(handle);
        else setProfileRouteError(error?.message || "Could not load this profile. Please reload to retry.");
      }).finally(() => {
        if (!cancelled) setResolvedProfileHandle(handle);
      });
    }
    return () => { cancelled = true; };
  }, [pathname, resetProfileVisit, fetchAndMergeVisitByHandle,
    setProfileVisitUserId, setProfileNotFoundHandle, setResolvedProfileHandle,
    setProfileRouteError, hydratePostFromServer]);

  // `#profile@x` / `#forum` legacy links → real paths once.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const migrateHash = () => {
      const raw = window.location.hash.replace(/^#/, "").trim();
      if (!raw) return;

      const postHash = /^post-(.+)$/i.exec(raw);
      if (postHash) {
        const pid = postHash[1].trim();
        if (!pid) return;
        const baseSearch = typeof window.location.search === "string" ? window.location.search : "";
        navigateTalks(`/p/${encodeURIComponent(pid)}${baseSearch}`, { replace: true });
        return;
      }

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
        navigateTalks(`/profile/${encodeURIComponent(handle)}${baseSearch}`, { replace: true });
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
        navigateTalks(simple + baseSearch, { replace: true });
      }
    };

    migrateHash();
    window.addEventListener("hashchange", migrateHash);
    return () => window.removeEventListener("hashchange", migrateHash);
  }, []);

  return null;
}
