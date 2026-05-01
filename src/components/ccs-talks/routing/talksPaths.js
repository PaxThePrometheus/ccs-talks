/** “Real” URLs for CCS Talks (App Router segments), analogous to `/admin`, `/admin/login`. */

/** First path segment → internal `page` key (excluding profile). */
const SEGMENT_MAP = /** @type {Record<string, string>} */ ({
  forum: "forum",
  announcements: "announcements",
  tickets: "tickets",
  search: "search",
  login: "login",
  register: "register",
  about: "about",
  "forgot-password": "forgot-password",
  "reset-password": "reset-password",
  activities: "activities",
  bookmarks: "bookmarks",
  friends: "friends",
  subs: "subs",
  settings: "settings",
});

export function normalizeTalksPathname(pathname) {
  if (!pathname || pathname === "") return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** @typedef {{ page: string, profileHandle: string|null, selfProfile?: boolean }} TalksParsedPath */

/**
 * Parse App Router pathname into virtual page + optional `@handle`-style slug.
 * @returns {TalksParsedPath}
 */
export function parseTalksPathname(pathname) {
  const p = normalizeTalksPathname(pathname);
  const parts = p === "/" ? [] : p.slice(1).split("/");

  if (parts.length === 0) {
    return { page: "landing", profileHandle: null };
  }

  const a0 = decodeURIComponent(parts[0]).toLowerCase();

  if (a0 === "profile") {
    if (!parts[1]) {
      return { page: "profile", profileHandle: null, selfProfile: true };
    }
    let h = decodeURIComponent(parts[1]);
    if (h.startsWith("@")) h = h.slice(1);
    return { page: "profile", profileHandle: h.trim() };
  }

  const mapped = SEGMENT_MAP[a0];
  if (mapped) {
    return { page: mapped, profileHandle: null };
  }

  return { page: "landing", profileHandle: null };
}

/**
 * Map app state → canonical pathname (no query string).
 * Returns `null` when URL cannot be computed yet (e.g. viewing by id before handle merges).
 *
 * @param {{ page: string, profileVisitUserId: string|null, profile?: { id?: string, handle?: string }, users?: Record<string, { handle?: string }> }} s
 */
export function buildTalksPathname({ page, profileVisitUserId, profile, users }) {
  switch (page) {
    case "landing":
      return "/";
    case "forum":
      return "/forum";
    case "announcements":
      return "/announcements";
    case "tickets":
      return "/tickets";
    case "search":
      return "/search";
    case "login":
      return "/login";
    case "register":
      return "/register";
    case "about":
      return "/about";
    case "forgot-password":
      return "/forgot-password";
    case "reset-password":
      return "/reset-password";
    case "activities":
      return "/activities";
    case "bookmarks":
      return "/bookmarks";
    case "friends":
      return "/friends";
    case "subs":
      return "/subs";
    case "settings":
      return "/settings";
    case "profile": {
      const vid = profileVisitUserId;
      const selfId = profile?.id ? String(profile.id) : "";
      if (!vid || vid === selfId) {
        return "/profile";
      }
      const u = users?.[vid];
      const handle = typeof u?.handle === "string" ? u.handle.trim() : "";
      if (!handle) return null;
      return `/profile/${encodeURIComponent(handle)}`;
    }
    default:
      return "/";
  }
}
