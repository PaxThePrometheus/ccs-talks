/** “Real” URLs for CCS Talks (App Router segments), analogous to `/admin`, `/admin/login`. */

/** First path segment → internal `page` key (excluding profile and /p). */
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

/** Valid first path segments for the public Talks catch-all (used server-side for 404). */
const KNOWN_FIRST_SEGMENTS = new Set([
  ...Object.keys(SEGMENT_MAP),
  "profile",
  "p",
]);

/**
 * @param {string} seg
 * @returns {boolean}
 */
export function isKnownTalksFirstSegment(seg) {
  const s = String(seg || "").trim().toLowerCase();
  return KNOWN_FIRST_SEGMENTS.has(s);
}

/**
 * Validate optional catch-all `slug` from `[[...slug]]`.
 * @param {string[]|undefined|null} slug
 * @returns {{ ok: true } | { ok: false }}
 */
export function validateTalksSlugSegments(slug) {
  if (!slug || slug.length === 0) return { ok: true };

  let a0;
  try {
    a0 = decodeURIComponent(String(slug[0] || "")).trim().toLowerCase();
  } catch {
    return { ok: false };
  }

  if (!isKnownTalksFirstSegment(a0)) return { ok: false };

  if (a0 === "profile") {
    if (slug.length <= 2) return { ok: true };
    return { ok: false };
  }

  if (a0 === "p") {
    if (slug.length === 2 && String(slug[1] || "").trim()) return { ok: true };
    return { ok: false };
  }

  if (slug.length === 1) return { ok: true };
  return { ok: false };
}

export function normalizeTalksPathname(pathname) {
  if (!pathname || pathname === "") return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * @typedef {{
 *   page: string,
 *   profileHandle: string|null,
 *   selfProfile?: boolean,
 *   postId?: string|null,
 * }} TalksParsedPath
 */

/**
 * Parse App Router pathname into virtual page + optional slugs.
 * @returns {TalksParsedPath}
 */
export function parseTalksPathname(pathname) {
  const p = normalizeTalksPathname(pathname);
  const parts = p === "/" ? [] : p.slice(1).split("/");

  if (parts.length === 0) {
    return { page: "landing", profileHandle: null, postId: null };
  }

  const a0 = decodeURIComponent(parts[0]).toLowerCase();

  if (a0 === "profile") {
    if (!parts[1]) {
      return { page: "profile", profileHandle: null, selfProfile: true, postId: null };
    }
    let h = decodeURIComponent(parts[1]);
    if (h.startsWith("@")) h = h.slice(1);
    return { page: "profile", profileHandle: h.trim(), postId: null };
  }

  if (a0 === "p") {
    const raw = parts[1] != null ? decodeURIComponent(parts[1]) : "";
    const postId = String(raw || "").trim();
    if (!postId) return { page: "landing", profileHandle: null, postId: null };
    return { page: "post", profileHandle: null, postId };
  }

  const mapped = SEGMENT_MAP[a0];
  if (mapped) {
    return { page: mapped, profileHandle: null, postId: null };
  }

  return { page: "landing", profileHandle: null, postId: null };
}

/**
 * Map app state → canonical pathname (no query string).
 * Returns `null` when URL cannot be computed yet (e.g. viewing by id before handle merges).
 *
 * @param {{
 *   page: string,
 *   profileVisitUserId: string|null,
 *   profile?: { id?: string, handle?: string },
 *   users?: Record<string, { handle?: string }>,
 *   activePostId?: string|null,
 * }} s
 */
export function buildTalksPathname({ page, profileVisitUserId, profile, users, activePostId }) {
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
    case "post": {
      const id = String(activePostId || "").trim();
      if (!id) return null;
      return `/p/${encodeURIComponent(id)}`;
    }
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
