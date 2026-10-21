export const STAFF_SESSION_MS = 8 * 60 * 60 * 1000;
export const STAFF_IDLE_MS = 30 * 60 * 1000;
export const RECENT_AUTH_MS = 15 * 60 * 1000;

export function isStaff(role) {
  return role === "admin" || role === "moderator";
}

export function canManageUser(actor, target, operation = "profile") {
  if (!actor?.id || actor.banned || !target?.id) return false;
  if (operation === "role" || operation === "delete") return actor.role === "admin";
  if (operation === "ban" && actor.id === target.id) return false;
  return actor.role === "admin" || (actor.role === "moderator" && target.role === "student");
}

export function canAccessSection(role, key) {
  return isStaff(role) && (key !== "landing" || role === "admin");
}

export function staffSessionValid(session, now = Date.now()) {
  return Number(session.createdAt) > 0 && Number(session.lastSeenAt) > 0 &&
    Number(session.expiresAt) > now && now - Number(session.createdAt) < STAFF_SESSION_MS &&
    now - Number(session.lastSeenAt) < STAFF_IDLE_MS;
}

export function recentlyAuthenticated(session, now = Date.now()) {
  return Number(session?.authenticatedAt) > 0 && now - Number(session.authenticatedAt) < RECENT_AUTH_MS;
}
