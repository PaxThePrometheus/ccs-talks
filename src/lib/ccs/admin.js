import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, ilike, or } from "drizzle-orm";
import { DEFAULT_PROFILE } from "@/components/ccs-talks/config/appConfig";
import {
  CCS_DEFAULT_FRIENDS,
  CCS_DEFAULT_PREFS,
  CCS_DEFAULT_SUBS,
} from "./accountDefaults";
import { newPasswordRecord, sanitizeEmail } from "./auth";
import { getDb } from "./drizzle-client";
import { toPublicProfile } from "./publicUser";
import { formatStatNumber, mergeLandingCms } from "./landingDefaults";
import {
  insertSession,
  makeUserId,
  resolveViewerFromSession,
  uniqueHandle,
} from "./store";
import * as schema from "./schema";

export const ROLE_STUDENT = "student";
export const ROLE_MODERATOR = "moderator";
export const ROLE_ADMIN = "admin";

const STAFF_ROLES = new Set([ROLE_MODERATOR, ROLE_ADMIN]);

export const DEFAULT_SITE_SETTINGS = {
  registrationOpen: true,
  guestReadOnly: true,
  requireEmailVerification: false,
  autoModLinkPosts: false,
  bannedWords: [],
};

/** Resolve full row (incl. role/banned) — store.resolveViewerFromSession returns a domain shim. */
async function fullViewerRow(token) {
  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return null;
  const db = await getDb();
  const [row] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, viewer.id)).limit(1);
  return row ?? null;
}

/** Returns row when allowed, otherwise an object describing why not. */
export async function requireStaff(token, { adminOnly = false } = {}) {
  const row = await fullViewerRow(token);
  if (!row) return { error: "unauthorized", status: 401 };
  if (row.banned) return { error: "banned", status: 403 };
  if (adminOnly && row.role !== ROLE_ADMIN) return { error: "forbidden", status: 403 };
  if (!adminOnly && !STAFF_ROLES.has(row.role)) return { error: "forbidden", status: 403 };
  return { row };
}

export async function countAdmins() {
  const db = await getDb();
  const rows = await db.select({ id: schema.ccsUsers.id }).from(schema.ccsUsers).where(eq(schema.ccsUsers.role, ROLE_ADMIN));
  return rows.length;
}

export async function bootstrapStatus() {
  const db = await getDb();
  const adminCount = await countAdmins();
  const totalRows = await db.select({ id: schema.ccsUsers.id }).from(schema.ccsUsers);
  return {
    adminCount,
    totalUsers: totalRows.length,
    bootstrap: adminCount === 0,
    inviteRequired: adminCount > 0,
  };
}

function envInviteCode() {
  return String(process.env.CCS_ADMIN_INVITE || "").trim();
}

/**
 * Admin registration:
 *  - First admin (no admin in DB) → no invite required
 *  - Otherwise → must match `CCS_ADMIN_INVITE` env var
 */
export async function registerAdminAccount({ email, password, name, inviteCode }) {
  const db = await getDb();
  const cleanEmail = sanitizeEmail(email);
  const cleanName = String(name || "").trim();

  if (!cleanEmail || !password || !cleanName) return { error: "missing_fields", status: 400 };
  if (password.length < 10) return { error: "weak_password", status: 400, message: "Admin password must be at least 10 characters." };

  const adminCount = await countAdmins();
  const expectedInvite = envInviteCode();

  if (adminCount > 0) {
    if (!expectedInvite) {
      return { error: "invite_disabled", status: 403, message: "Admin self-registration is disabled. Ask an existing admin to promote your account." };
    }
    if (String(inviteCode || "").trim() !== expectedInvite) {
      return { error: "invalid_invite", status: 403, message: "Invite code is invalid." };
    }
  }

  const [existing] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.email, cleanEmail)).limit(1);

  if (existing) {
    /** Promote existing account to admin without changing password. */
    await db
      .update(schema.ccsUsers)
      .set({ role: ROLE_ADMIN, banned: false, bannedReason: "", bannedAt: null })
      .where(eq(schema.ccsUsers.id, existing.id));

    const sess = await insertSession(db, existing.id);
    await appendAudit(existing.id, "admin_self_register_existing", existing.id, { promoted: true });

    return {
      profile: toPublicProfile({ ...DEFAULT_PROFILE, ...(existing.profile || {}), id: existing.id }),
      role: ROLE_ADMIN,
      token: sess.token,
      expiresAt: sess.expiresAt,
      promoted: true,
    };
  }

  const id = makeUserId();
  const { salt, hash } = newPasswordRecord(password);
  const handleBase = (cleanEmail.split("@")[0] || "admin").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() || "admin";
  const handle = await uniqueHandle(db, handleBase);
  const profile = {
    ...DEFAULT_PROFILE,
    id,
    name: cleanName,
    handle,
    status: adminCount === 0 ? "Admin" : "Admin",
  };

  await db.insert(schema.ccsUsers).values({
    id,
    email: cleanEmail,
    passwordSalt: salt,
    passwordHash: hash,
    profile,
    bookmarkedPostIds: [],
    prefs: { ...CCS_DEFAULT_PREFS, onboardingCompleted: true },
    friendsState: CCS_DEFAULT_FRIENDS,
    subsState: CCS_DEFAULT_SUBS,
    activities: [],
    role: ROLE_ADMIN,
    banned: false,
    bannedReason: "",
    bannedAt: null,
    createdAt: Date.now(),
  });

  const sess = await insertSession(db, id);
  await appendAudit(id, adminCount === 0 ? "admin_bootstrap" : "admin_self_register", id, { handle });

  return {
    profile: toPublicProfile(profile),
    role: ROLE_ADMIN,
    token: sess.token,
    expiresAt: sess.expiresAt,
    bootstrap: adminCount === 0,
  };
}

/** ---------- audit log ---------- */
export async function appendAudit(actorId, action, targetId = "", meta = {}) {
  try {
    const db = await getDb();
    await db.insert(schema.ccsAuditLog).values({
      id: `a_${randomUUID()}`,
      actorId: actorId || "system",
      action: String(action || "unknown").slice(0, 80),
      targetId: String(targetId || "").slice(0, 80),
      meta: meta && typeof meta === "object" ? meta : {},
      createdAt: Date.now(),
    });
  } catch {
    /** Audit failures must never break user-facing actions. */
  }
}

export async function listAudit({ limit = 100 } = {}) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.ccsAuditLog)
    .orderBy(desc(schema.ccsAuditLog.createdAt))
    .limit(Math.max(1, Math.min(500, Number(limit) || 100)));
  return rows.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    action: r.action,
    targetId: r.targetId,
    meta: r.meta || {},
    createdAt: Number(r.createdAt) || 0,
  }));
}

/** ---------- site settings ---------- */
export async function getSiteSettings() {
  const db = await getDb();
  const [row] = await db.select().from(schema.ccsSiteSettings).where(eq(schema.ccsSiteSettings.key, "site")).limit(1);
  if (!row) return { ...DEFAULT_SITE_SETTINGS };
  const v = row.value && typeof row.value === "object" ? row.value : {};
  return { ...DEFAULT_SITE_SETTINGS, ...v };
}

export async function setSiteSettings(actorId, patch) {
  const db = await getDb();
  const current = await getSiteSettings();
  const next = { ...current, ...(patch && typeof patch === "object" ? patch : {}) };

  if (Array.isArray(next.bannedWords)) {
    next.bannedWords = next.bannedWords
      .map((w) => String(w || "").trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 256);
  }

  const now = Date.now();
  await db
    .insert(schema.ccsSiteSettings)
    .values({ key: "site", value: next, updatedAt: now, updatedBy: actorId })
    .onConflictDoUpdate({
      target: schema.ccsSiteSettings.key,
      set: { value: next, updatedAt: now, updatedBy: actorId },
    });

  await appendAudit(actorId, "site_settings_update", "site", { keys: Object.keys(patch || {}) });

  return next;
}

/** ---------- users (admin) ---------- */
function adminUserView(row) {
  const merged = { ...DEFAULT_PROFILE, ...(row.profile || {}), id: row.id };
  return {
    id: row.id,
    email: row.email,
    role: row.role || ROLE_STUDENT,
    banned: !!row.banned,
    bannedReason: row.bannedReason || "",
    bannedAt: row.bannedAt ? Number(row.bannedAt) : null,
    createdAt: row.createdAt ? Number(row.createdAt) : null,
    profile: toPublicProfile(merged),
  };
}

export async function listUsers({ q = "", role = "" } = {}) {
  const db = await getDb();
  const filters = [];
  const text = String(q || "").trim();
  if (text) {
    const like = `%${text.toLowerCase()}%`;
    filters.push(or(ilike(schema.ccsUsers.email, like), ilike(schema.ccsUsers.id, like)));
  }
  if (role) filters.push(eq(schema.ccsUsers.role, role));

  const rows = await (
    filters.length === 0
      ? db.select().from(schema.ccsUsers)
      : db.select().from(schema.ccsUsers).where(filters.length === 1 ? filters[0] : and(...filters))
  );

  /** Secondary sort: admins first, then mods, then by id descending */
  const order = { [ROLE_ADMIN]: 0, [ROLE_MODERATOR]: 1, [ROLE_STUDENT]: 2 };
  rows.sort((a, b) => {
    const ar = order[a.role] ?? 3;
    const br = order[b.role] ?? 3;
    if (ar !== br) return ar - br;
    return String(b.id).localeCompare(String(a.id));
  });

  return rows.map(adminUserView);
}

export async function getUserDetailById(userId) {
  const db = await getDb();
  const [row] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, userId)).limit(1);
  return row ? adminUserView(row) : null;
}

export async function setUserRole(actor, targetUserId, nextRole) {
  if (![ROLE_STUDENT, ROLE_MODERATOR, ROLE_ADMIN].includes(nextRole)) {
    return { error: "bad_role", status: 400 };
  }
  if (actor.role !== ROLE_ADMIN) return { error: "forbidden", status: 403 };

  const db = await getDb();
  const [target] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, targetUserId)).limit(1);
  if (!target) return { error: "not_found", status: 404 };

  if (target.id === actor.id && nextRole !== ROLE_ADMIN) {
    /** Don't allow last admin to demote themselves and lock everyone out. */
    const adminCount = await countAdmins();
    if (adminCount <= 1) return { error: "last_admin", status: 409, message: "Cannot demote the only remaining admin." };
  }

  await db.update(schema.ccsUsers).set({ role: nextRole }).where(eq(schema.ccsUsers.id, targetUserId));
  await appendAudit(actor.id, "user_set_role", targetUserId, { from: target.role, to: nextRole });

  return { user: await getUserDetailById(targetUserId) };
}

export async function setUserBadges(actor, targetUserId, badges) {
  const db = await getDb();
  const [target] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, targetUserId)).limit(1);
  if (!target) return { error: "not_found", status: 404 };

  const arr = Array.isArray(badges) ? badges.map((x) => String(x || "").trim().slice(0, 40)).filter(Boolean) : [];
  const nextBadges = arr.slice(0, 8);

  const prevProfile = typeof target.profile === "object" && target.profile ? target.profile : {};
  const merged = { ...DEFAULT_PROFILE, ...prevProfile, id: target.id, badges: nextBadges };

  await db.update(schema.ccsUsers).set({ profile: merged }).where(eq(schema.ccsUsers.id, targetUserId));
  await appendAudit(actor.id, "user_badges_update", targetUserId, { count: nextBadges.length });

  return { user: await getUserDetailById(targetUserId) };
}

export async function setUserBanned(actor, targetUserId, banned, reason = "") {
  const db = await getDb();
  const [target] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, targetUserId)).limit(1);
  if (!target) return { error: "not_found", status: 404 };
  if (target.id === actor.id) return { error: "self_ban", status: 409, message: "You cannot ban yourself." };
  if (target.role === ROLE_ADMIN && actor.role !== ROLE_ADMIN) return { error: "forbidden", status: 403 };

  const now = Date.now();
  await db
    .update(schema.ccsUsers)
    .set({
      banned: !!banned,
      bannedReason: banned ? String(reason || "").slice(0, 240) : "",
      bannedAt: banned ? now : null,
    })
    .where(eq(schema.ccsUsers.id, targetUserId));

  if (banned) {
    /** Revoke all sessions for the banned user. */
    await db.delete(schema.ccsSessions).where(eq(schema.ccsSessions.userId, targetUserId));
  }

  await appendAudit(actor.id, banned ? "user_ban" : "user_unban", targetUserId, { reason });

  return { user: await getUserDetailById(targetUserId) };
}

export async function deleteUserCascade(actor, targetUserId) {
  if (actor.role !== ROLE_ADMIN) return { error: "forbidden", status: 403 };
  if (actor.id === targetUserId) return { error: "self_delete", status: 409, message: "Use the account settings to delete your own account." };

  const db = await getDb();
  const [target] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, targetUserId)).limit(1);
  if (!target) return { error: "not_found", status: 404 };

  if (target.role === ROLE_ADMIN) {
    const adminCount = await countAdmins();
    if (adminCount <= 1) return { error: "last_admin", status: 409, message: "Cannot delete the only remaining admin." };
  }

  await db.delete(schema.ccsSessions).where(eq(schema.ccsSessions.userId, targetUserId));
  await db.delete(schema.ccsComments).where(eq(schema.ccsComments.userId, targetUserId));
  await db.delete(schema.ccsPosts).where(eq(schema.ccsPosts.userId, targetUserId));
  await db.delete(schema.ccsPresence).where(eq(schema.ccsPresence.userId, targetUserId));
  await db.delete(schema.ccsUsers).where(eq(schema.ccsUsers.id, targetUserId));

  await appendAudit(actor.id, "user_delete", targetUserId, { email: target.email });

  return { ok: true };
}

/** ---------- posts (admin) ---------- */
export async function listAllPosts({ q = "" } = {}) {
  const db = await getDb();
  const text = String(q || "").trim();
  const rows = await (
    text
      ? db.select().from(schema.ccsPosts).where(ilike(schema.ccsPosts.content, `%${text}%`)).orderBy(desc(schema.ccsPosts.createdAt))
      : db.select().from(schema.ccsPosts).orderBy(desc(schema.ccsPosts.createdAt))
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    content: r.content,
    tag: r.tag,
    imageUrl: r.imageUrl || "",
    createdAt: Number(r.createdAt) || 0,
    pinned: !!r.pinned,
    likedBy: Array.isArray(r.likedBy) ? r.likedBy : [],
    commentCount: Number(r.commentCount ?? 0),
  }));
}

export async function adminPinPost(actor, postId, pinned) {
  const db = await getDb();
  await db.update(schema.ccsPosts).set({ pinned: !!pinned }).where(eq(schema.ccsPosts.id, postId));
  await appendAudit(actor.id, pinned ? "post_pin" : "post_unpin", postId, {});
  return { ok: true };
}

export async function adminEditPost(actor, postId, content) {
  const db = await getDb();
  const v = String(content || "").slice(0, 2000);
  await db.update(schema.ccsPosts).set({ content: v }).where(eq(schema.ccsPosts.id, postId));
  await appendAudit(actor.id, "post_edit", postId, { length: v.length });
  return { ok: true };
}

export async function adminDeletePost(actor, postId) {
  const db = await getDb();
  await db.delete(schema.ccsComments).where(eq(schema.ccsComments.postId, postId));
  await db.delete(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId));
  await appendAudit(actor.id, "post_delete", postId, {});
  return { ok: true };
}

/** ---------- overview ---------- */
export async function getOverview() {
  const db = await getDb();
  const [users, posts, comments, audit] = await Promise.all([
    db.select().from(schema.ccsUsers),
    db.select({ id: schema.ccsPosts.id }).from(schema.ccsPosts),
    db.select({ id: schema.ccsComments.id }).from(schema.ccsComments),
    db.select().from(schema.ccsAuditLog).orderBy(desc(schema.ccsAuditLog.createdAt)).limit(10),
  ]);

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === ROLE_ADMIN).length;
  const totalMods = users.filter((u) => u.role === ROLE_MODERATOR).length;
  const totalBanned = users.filter((u) => !!u.banned).length;

  return {
    totals: {
      users: totalUsers,
      admins: totalAdmins,
      moderators: totalMods,
      banned: totalBanned,
      posts: posts.length,
      comments: comments.length,
    },
    recentAudit: audit.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      action: r.action,
      targetId: r.targetId,
      meta: r.meta || {},
      createdAt: Number(r.createdAt) || 0,
    })),
  };
}

/** ---------- landing CMS & public hero stats ---------- */
const LANDING_SETTINGS_KEY = "landing";

async function landingStats(db) {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const [[{ n: nu }], [{ n: np }], [{ n: na }]] = await Promise.all([
    db.select({ n: count() }).from(schema.ccsUsers),
    db.select({ n: count() }).from(schema.ccsPosts),
    db.select({ n: count() }).from(schema.ccsPresence).where(gte(schema.ccsPresence.lastSeen, dayAgo)),
  ]);
  return {
    members: Number(nu ?? 0),
    threads: Number(np ?? 0),
    activeToday: Number(na ?? 0),
  };
}

export async function getLandingCmsMerged() {
  const db = await getDb();
  const [row] = await db.select().from(schema.ccsSiteSettings).where(eq(schema.ccsSiteSettings.key, LANDING_SETTINGS_KEY)).limit(1);
  const stored = row?.value && typeof row.value === "object" ? row.value : {};
  return mergeLandingCms(stored);
}

export async function getPublicLandingBundle() {
  const db = await getDb();
  const [meta] = await db.select().from(schema.ccsSiteSettings).where(eq(schema.ccsSiteSettings.key, LANDING_SETTINGS_KEY)).limit(1);

  const cms = await getLandingCmsMerged();
  const raw = await landingStats(db);

  const stats = [
    { k: cms.statLabels.members, v: formatStatNumber(raw.members), raw: raw.members },
    { k: cms.statLabels.threads, v: formatStatNumber(raw.threads), raw: raw.threads },
    { k: cms.statLabels.activeToday, v: formatStatNumber(raw.activeToday), raw: raw.activeToday },
  ];

  return {
    cms,
    stats,
    updatedAt: meta ? Number(meta.updatedAt) || null : null,
    counts: raw,
  };
}

export async function saveLandingCms(actorId, body) {
  if (!body || typeof body !== "object") return { error: "invalid_body", status: 400 };
  /** Accept either `{ cms: {...} }` or a raw CMS root object. */
  const candidate = body.cms !== undefined ? body.cms : body;
  const normalized = mergeLandingCms(candidate && typeof candidate === "object" ? candidate : {});
  const db = await getDb();
  const now = Date.now();
  await db
    .insert(schema.ccsSiteSettings)
    .values({ key: LANDING_SETTINGS_KEY, value: normalized, updatedAt: now, updatedBy: actorId })
    .onConflictDoUpdate({
      target: schema.ccsSiteSettings.key,
      set: { value: normalized, updatedAt: now, updatedBy: actorId },
    });

  await appendAudit(actorId, "landing_cms_update", LANDING_SETTINGS_KEY, {});

  return { cms: normalized };
}
