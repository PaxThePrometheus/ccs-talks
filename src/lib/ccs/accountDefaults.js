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
  largerText: false,
};

export const CCS_DEFAULT_FRIENDS = {
  friends: ["u_renz", "u_maica", "u_tricia"],
  pending: ["u_josh"],
  outgoing: ["u_miguel"],
};

export const CCS_DEFAULT_SUBS = {
  tags: [
    { tag: "Academics", notify: true },
    { tag: "Events", notify: true },
    { tag: "Tech", notify: false },
  ],
  follows: ["u_renz", "u_tricia"],
};

export function normalizePrefs(partial) {
  return { ...CCS_DEFAULT_PREFS, ...(partial && typeof partial === "object" ? partial : {}) };
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
