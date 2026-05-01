/** Shared defaults: used by React state (client) + Neon inserts (server). */

export const CCS_DEFAULT_PREFS = {
  mode: "dark",
  compact: false,
  language: "English",
  showSensitive: false,
  defaultPostTag: "General",
  feedSort: "latest",
  hideReportedAfter: 5,
  notifyMentions: true,
  notifyReplies: true,
  notifyFriendRequests: true,
  notifyDigest: false,
  notifySubscriptions: true,
  profileVisibility: "Public",
  allowDMs: "Friends",
  showOnlineStatus: true,
  reduceMotion: false,
  /** Disables animated WebGL/2D backgrounds and strips heavy glass blur (see `.ccs-low-power`). */
  reduceEffects: false,
  largerText: false,
  onboardingCompleted: false,
};

/** Whitelisted preference keys — anything else from the client is dropped. */
const PREFS_KEYS = new Set(Object.keys(CCS_DEFAULT_PREFS));

export const CCS_DEFAULT_FRIENDS = {
  friends: [],
  pending: [],
  outgoing: [],
};

export const CCS_DEFAULT_SUBS = {
  tags: [
    { tag: "Academics", notify: true },
    { tag: "Events", notify: true },
    { tag: "Tech", notify: false },
  ],
  follows: [],
};

export function normalizePrefs(partial) {
  const out = { ...CCS_DEFAULT_PREFS };
  if (!partial || typeof partial !== "object") return out;

  for (const [k, v] of Object.entries(partial)) {
    if (!PREFS_KEYS.has(k)) continue;
    const def = CCS_DEFAULT_PREFS[k];
    if (typeof def === "boolean") {
      out[k] = !!v;
    } else if (typeof def === "number") {
      const n = Number(v);
      out[k] = Number.isFinite(n) ? n : def;
    } else if (typeof def === "string") {
      out[k] = typeof v === "string" ? v.slice(0, 80) : def;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function normalizeFriends(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  return {
    friends: Array.isArray(o.friends) ? o.friends : CCS_DEFAULT_FRIENDS.friends,
    pending: Array.isArray(o.pending) ? o.pending : CCS_DEFAULT_FRIENDS.pending,
    outgoing: Array.isArray(o.outgoing) ? o.outgoing : CCS_DEFAULT_FRIENDS.outgoing,
  };
}

export function normalizeSubs(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const tags = Array.isArray(o.tags) ? o.tags : CCS_DEFAULT_SUBS.tags;
  const follows = Array.isArray(o.follows) ? o.follows : CCS_DEFAULT_SUBS.follows;
  return { tags, follows };
}

export function normalizeActivities(raw) {
  const a = Array.isArray(raw) ? raw : [];
  return a.slice(0, 200);
}
