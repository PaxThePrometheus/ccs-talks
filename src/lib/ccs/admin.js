import { auditedMutation } from "./auditedMutation";
import { validateContent } from "./contentPolicy";
import {
  RequestError,
  objectBody,
  textField,
  booleanField,
  resultRows,
} from "./requestValidation.mjs";
import { canManageUser, recentlyAuthenticated } from "./staffPolicy.mjs";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gt, gte, ilike, or, sql } from "drizzle-orm";
import { DEFAULT_PROFILE } from "@/components/ccs-talks/config/appConfig";
import { getDb, queryDb } from "./drizzle-client";
import { toPublicProfile } from "./publicUser";
import { sanitizePublicRoleBadge } from "./statusBadges";
import {
  defaultLandingCms,
  formatStatNumber,
  mergeLandingCms,
} from "./landingDefaults";
import {
  BADGE_REGISTRY_MAX,
  badgeColorsMapFromRegistry,
  ensureBadgeRegistryAndColors,
  sanitizeBadgeRegistryInput,
} from "./badgeColors";
import { publicAppBaseUrl } from "./mailer";
import {
  clampMediaField,
  isHandleTakenElsewhere,
  PROFILE_PATCH_FIELD_KEYS,
  resolveSessionRow,
} from "./store";
import {
  CCS_OLFU_UNIVERSITY,
  DEFAULT_PROFILE_FIELD_OPTIONS,
  mergeProfileFieldOptions,
  sanitizeProfileSelectFields,
} from "./profileOptions";
import * as schema from "./schema";

export const ROLE_STUDENT = "student";
export const ROLE_MODERATOR = "moderator";
export const ROLE_ADMIN = "admin";

const STAFF_ROLES = new Set([ROLE_MODERATOR, ROLE_ADMIN]);

/** Profile fields moderators/admins may set via PATCH (plus status & badges below). */
const STAFF_PROFILE_PATCH_KEYS = new Set([
  ...PROFILE_PATCH_FIELD_KEYS,
  "status",
  "badges",
  "publicRoleBadge",
]);

export const DEFAULT_SITE_SETTINGS = {
  registrationOpen: true,
  guestReadOnly: true,
  requireEmailVerification: false,
  autoModLinkPosts: false,
  bannedWords: [],
  profileFieldOptions: DEFAULT_PROFILE_FIELD_OPTIONS,
  /** Registered badges (label + colour); `badgeColors` is derived when persisting / returning settings. */
  badgeRegistry: [],
  badgeColors: {},
};

/** Returns row when allowed, otherwise an object describing why not. */
export async function requireStaff(
  token,
  { adminOnly = false, recentAuth = false } = {},
) {
  const match = await resolveSessionRow(token);
  if (!match) return { error: "unauthorized", status: 401 };
  const { row, session } = match;
  if (row.banned) return { error: "banned", status: 403 };
  if (adminOnly && row.role !== ROLE_ADMIN)
    return { error: "forbidden", status: 403 };
  if (!adminOnly && !STAFF_ROLES.has(row.role))
    return { error: "forbidden", status: 403 };
  if (recentAuth) {
    if (!recentlyAuthenticated(session))
      return { error: "reauth_required", status: 428 };
  }
  return { row };
}

export async function countAdmins() {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.ccsUsers.id })
    .from(schema.ccsUsers)
    .where(
      and(
        eq(schema.ccsUsers.role, ROLE_ADMIN),
        eq(schema.ccsUsers.banned, false),
      ),
    );
  return rows.length;
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
  } catch (error) {
    console.error("Required audit write failed");
    throw error;
  }
}

/** Moderation queue: user-submitted post reports (open only). */
export async function staffListOpenReports(actorRow, { limit = 80 } = {}) {
  if (!actorRow?.id || !STAFF_ROLES.has(actorRow.role))
    return { error: "forbidden", status: 403 };
  const db = await getDb();
  const lim = Math.max(1, Math.min(200, Number(limit) || 80));
  const rows = await db
    .select()
    .from(schema.ccsReports)
    .where(eq(schema.ccsReports.status, "open"))
    .orderBy(desc(schema.ccsReports.createdAt))
    .limit(lim);
  return {
    reports: rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      reporterUserId: r.reporterUserId,
      reason: r.reason || "",
      status: r.status,
      snapshot: r.snapshot || {},
      resolutionNote: r.resolutionNote || "",
      createdAt: Number(r.createdAt) || 0,
    })),
  };
}

export async function staffResolveForumReport(
  actorRow,
  reportId,
  nextStatus,
  note = "",
  removePost = false,
) {
  if (!actorRow?.id || !STAFF_ROLES.has(actorRow.role))
    return { error: "forbidden", status: 403 };
  if (!["resolved", "dismissed"].includes(nextStatus))
    throw new RequestError("Invalid report status.");
  const resolutionNote = textField(note, "Resolution note", 1000);
  booleanField(removePost, "Remove post");
  if (removePost && (nextStatus !== "resolved" || !resolutionNote))
    throw new RequestError("Removing a post requires a resolution note.");
  const db = await getDb();
  const [report] = await db
    .select()
    .from(schema.ccsReports)
    .where(eq(schema.ccsReports.id, reportId))
    .limit(1);
  if (!report) return { error: "not_found", status: 404 };
  if (report.status !== "open") return { error: "already_closed", status: 409 };
  const [post] = await db
    .select()
    .from(schema.ccsPosts)
    .where(eq(schema.ccsPosts.id, report.postId))
    .limit(1);
  const snapshot = post
    ? {
        post: {
          id: post.id,
          userId: post.userId,
          content: post.content,
          imageUrl: post.imageUrl,
          tag: post.tag,
          createdAt: post.createdAt,
        },
      }
    : report.snapshot;
  await auditedMutation(
    actorRow.id,
    removePost ? "forum_report_remove_post" : "forum_report_" + nextStatus,
    reportId,
    "UPDATE ccs_reports SET status=$1,resolved_by_user_id=$2,resolved_at=$3,resolution_note=$4,snapshot=$5::jsonb WHERE id=$6 AND status='open'",
    [
      nextStatus,
      actorRow.id,
      Date.now(),
      resolutionNote,
      JSON.stringify(snapshot),
      reportId,
    ],
    { postId: report.postId, note: resolutionNote },
    null,
    null,
    removePost ? report.postId : null,
  );
  return { ok: true };
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
  const [row] = await db
    .select()
    .from(schema.ccsSiteSettings)
    .where(eq(schema.ccsSiteSettings.key, "site"))
    .limit(1);
  if (!row) {
    const merged = {
      ...DEFAULT_SITE_SETTINGS,
      profileFieldOptions: mergeProfileFieldOptions(null),
    };
    const badge = ensureBadgeRegistryAndColors(merged);
    return {
      ...merged,
      ...badge,
      version: 0,
      requireEmailVerification: false,
      autoModLinkPosts: false,
    };
  }
  const v = row.value && typeof row.value === "object" ? row.value : {};
  const merged = { ...DEFAULT_SITE_SETTINGS, ...v };
  merged.profileFieldOptions = mergeProfileFieldOptions(
    merged.profileFieldOptions,
  );
  const badge = ensureBadgeRegistryAndColors(merged);
  return {
    ...merged,
    ...badge,
    version: Number(row.version || 0),
    requireEmailVerification: false,
    autoModLinkPosts: false,
  };
}

export async function getMergedProfileFieldOptions() {
  const s = await getSiteSettings();
  return s.profileFieldOptions || mergeProfileFieldOptions(null);
}

export async function setSiteSettings(actorId, patch) {
  objectBody(patch, [
    "registrationOpen",
    "guestReadOnly",
    "requireEmailVerification",
    "autoModLinkPosts",
    "bannedWords",
    "profileFieldOptions",
    "badgeRegistry",
    "expectedVersion",
  ]);
  for (const key of [
    "registrationOpen",
    "guestReadOnly",
    "requireEmailVerification",
    "autoModLinkPosts",
  ])
    if (key in patch) booleanField(patch[key], key);
  if (patch.requireEmailVerification || patch.autoModLinkPosts)
    throw new RequestError(
      "This policy is unavailable until its server workflow is implemented.",
      422,
    );
  if ("bannedWords" in patch) {
    if (!Array.isArray(patch.bannedWords) || patch.bannedWords.length > 256)
      throw new RequestError("Supply up to 256 banned terms.");
    patch.bannedWords.forEach((word) =>
      textField(word, "Banned term", 80, { empty: false }),
    );
  }
  if ("profileFieldOptions" in patch) {
    objectBody(
      patch.profileFieldOptions,
      Object.keys(DEFAULT_PROFILE_FIELD_OPTIONS),
    );
    for (const values of Object.values(patch.profileFieldOptions)) {
      if (!Array.isArray(values) || values.length > 96)
        throw new RequestError("Supply up to 96 dropdown options.");
      values.forEach((value) =>
        textField(value, "Dropdown option", 120, { empty: false }),
      );
    }
  }
  if ("badgeRegistry" in patch) {
    if (
      !Array.isArray(patch.badgeRegistry) ||
      patch.badgeRegistry.length > BADGE_REGISTRY_MAX
    )
      throw new RequestError("Invalid badge registry.");
    const labels = new Set();
    for (const badge of patch.badgeRegistry) {
      objectBody(badge, ["id", "label", "color"]);
      const label = textField(badge.label, "Badge label", 64, { empty: false });
      if (badge.id !== undefined)
        textField(badge.id, "Badge identifier", 72, { empty: false });
      if (labels.has(label.toLowerCase()))
        throw new RequestError("Badge labels must be unique.");
      labels.add(label.toLowerCase());
      if (!/^#[0-9a-f]{6}$/i.test(badge.color))
        throw new RequestError("Badge colours must be six-digit hex values.");
    }
  }
  const db = await getDb();
  const current = await getSiteSettings();
  const next = {
    ...current,
    ...(patch && typeof patch === "object" ? patch : {}),
  };

  if (Array.isArray(next.bannedWords)) {
    next.bannedWords = next.bannedWords
      .map((w) =>
        String(w || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean)
      .slice(0, 256);
  }

  if (
    patch &&
    typeof patch === "object" &&
    patch.profileFieldOptions &&
    typeof patch.profileFieldOptions === "object"
  ) {
    next.profileFieldOptions = mergeProfileFieldOptions({
      ...mergeProfileFieldOptions(current.profileFieldOptions || null),
      ...patch.profileFieldOptions,
    });
  } else {
    next.profileFieldOptions = mergeProfileFieldOptions(
      next.profileFieldOptions || null,
    );
  }

  if (
    patch &&
    typeof patch === "object" &&
    Array.isArray(patch.badgeRegistry)
  ) {
    next.badgeRegistry = sanitizeBadgeRegistryInput(patch.badgeRegistry);
    next.badgeColors = badgeColorsMapFromRegistry(next.badgeRegistry);
  } else {
    const badge = ensureBadgeRegistryAndColors(next);
    next.badgeRegistry = badge.badgeRegistry;
    next.badgeColors = badge.badgeColors;
  }

  const expectedVersion = patch.expectedVersion ?? current.version;
  delete next.expectedVersion;
  delete next.version;
  next.requireEmailVerification = false;
  next.autoModLinkPosts = false;
  const saved = await auditedMutation(
    actorId,
    "site_settings_update",
    "site",
    `INSERT INTO ccs_site_settings(key,value,updated_at,updated_by) VALUES('site',$1::jsonb,$2,$3)
      ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by
      WHERE ccs_site_settings.version=$4`,
    [JSON.stringify(next), Date.now(), actorId, expectedVersion],
    { keys: Object.keys(patch).filter((key) => key !== "expectedVersion") },
  );
  next.version = Number(saved.version);

  return next;
}

/** ---------- users (admin) ---------- */
function adminUserView(row) {
  const merged = { ...DEFAULT_PROFILE, ...(row.profile || {}), id: row.id };
  return {
    id: row.id,
    email: row.email,
    version: Number(row.version || 0),
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
    filters.push(
      or(ilike(schema.ccsUsers.email, like), ilike(schema.ccsUsers.id, like)),
    );
  }
  if (role) filters.push(eq(schema.ccsUsers.role, role));

  const rows = await (filters.length === 0
    ? db.select().from(schema.ccsUsers)
    : db
        .select()
        .from(schema.ccsUsers)
        .where(filters.length === 1 ? filters[0] : and(...filters)));

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
  const [row] = await db
    .select()
    .from(schema.ccsUsers)
    .where(eq(schema.ccsUsers.id, userId))
    .limit(1);
  return row ? adminUserView(row) : null;
}

export async function setUserRole(
  actor,
  targetUserId,
  nextRole,
  expectedVersion,
) {
  if (![ROLE_STUDENT, ROLE_MODERATOR, ROLE_ADMIN].includes(nextRole)) {
    return { error: "bad_role", status: 400 };
  }
  if (actor.role !== ROLE_ADMIN) return { error: "forbidden", status: 403 };

  const db = await getDb();
  const [target] = await db
    .select()
    .from(schema.ccsUsers)
    .where(eq(schema.ccsUsers.id, targetUserId))
    .limit(1);
  if (!target) return { error: "not_found", status: 404 };
  if (
    expectedVersion !== undefined &&
    expectedVersion !== Number(target.version)
  )
    throw new RequestError("Account changed. Reload before saving.", 409);
  if (!canManageUser(actor, target, "role"))
    return { error: "forbidden", status: 403 };

  if (target.id === actor.id && nextRole !== ROLE_ADMIN) {
    /** Don't allow last admin to demote themselves and lock everyone out. */
    const adminCount = await countAdmins();
    if (adminCount <= 1)
      return {
        error: "last_admin",
        status: 409,
        message: "Cannot demote the only remaining admin.",
      };
  }

  await auditedMutation(
    actor.id,
    "user_set_role",
    targetUserId,
    "UPDATE ccs_users SET role=$1 WHERE id=$2 AND version=$3",
    [nextRole, targetUserId, target.version],
    { from: target.role, to: nextRole },
  );

  return { user: await getUserDetailById(targetUserId) };
}

export async function setUserBadges(
  actor,
  targetUserId,
  badges,
  expectedVersion,
) {
  const db = await getDb();
  const [target] = await db
    .select()
    .from(schema.ccsUsers)
    .where(eq(schema.ccsUsers.id, targetUserId))
    .limit(1);
  if (!target) return { error: "not_found", status: 404 };
  if (
    expectedVersion !== undefined &&
    expectedVersion !== Number(target.version)
  )
    throw new RequestError("Account changed. Reload before saving.", 409);
  if (!canManageUser(actor, target, "profile"))
    return { error: "forbidden", status: 403 };

  if (!Array.isArray(badges) || badges.length > 8)
    throw new RequestError("Supply up to eight badges.");
  const arr = badges.map((value) =>
    textField(value, "Badge", 64, { empty: false }),
  );
  const nextBadges = arr.slice(0, 8);

  const prevProfile =
    typeof target.profile === "object" && target.profile ? target.profile : {};
  const merged = {
    ...DEFAULT_PROFILE,
    ...prevProfile,
    id: target.id,
    badges: nextBadges,
  };
  merged.university = CCS_OLFU_UNIVERSITY;

  await auditedMutation(
    actor.id,
    "user_badges_update",
    targetUserId,
    "UPDATE ccs_users SET profile=$1::jsonb WHERE id=$2 AND version=$3",
    [JSON.stringify(merged), targetUserId, target.version],
    { count: nextBadges.length },
  );

  return { user: await getUserDetailById(targetUserId) };
}

export async function setUserStatus(
  actor,
  targetUserId,
  status,
  expectedVersion,
) {
  if (!STAFF_ROLES.has(actor.role)) return { error: "forbidden", status: 403 };
  const db = await getDb();
  const [target] = await db
    .select()
    .from(schema.ccsUsers)
    .where(eq(schema.ccsUsers.id, targetUserId))
    .limit(1);
  if (!target) return { error: "not_found", status: 404 };
  if (
    expectedVersion !== undefined &&
    expectedVersion !== Number(target.version)
  )
    throw new RequestError("Account changed. Reload before saving.", 409);
  if (!canManageUser(actor, target, "profile"))
    return { error: "forbidden", status: 403 };

  const s = textField(status, "Status", 80);
  const prevProfile =
    typeof target.profile === "object" && target.profile ? target.profile : {};
  const merged = {
    ...DEFAULT_PROFILE,
    ...prevProfile,
    id: target.id,
    status: s,
  };
  merged.university = CCS_OLFU_UNIVERSITY;

  await auditedMutation(
    actor.id,
    "user_status_update",
    targetUserId,
    "UPDATE ccs_users SET profile=$1::jsonb WHERE id=$2 AND version=$3",
    [JSON.stringify(merged), targetUserId, target.version],
    { length: s.length },
  );

  return { user: await getUserDetailById(targetUserId) };
}

/** Staff merges public profile fields (and status/badges) without username cooldown limits. */
export async function patchUserProfileAsStaff(
  actor,
  targetUserId,
  incoming,
  expectedVersion,
) {
  if (!STAFF_ROLES.has(actor.role)) return { error: "forbidden", status: 403 };
  objectBody(incoming, [...STAFF_PROFILE_PATCH_KEYS]);
  for (const [key, value] of Object.entries(incoming)) {
    if (/(?:Color|Accent)$/.test(key)) textField(value, key, 36);
    if (key === "publicRoleBadge" && value === null) continue;
    if (key === "badges") {
      if (!Array.isArray(value) || value.length > 8)
        throw new RequestError("Supply up to eight badges.");
      value.forEach((item) => textField(item, "Badge", 64, { empty: false }));
    } else
      textField(
        value,
        key,
        ["avatarImage", "bannerImage", "signatureImage"].includes(key)
          ? 8_000_000
          : key === "bio" || key === "signature"
            ? 280
            : key === "signatureLink"
              ? 4096
              : key === "handle"
                ? 32
                : key === "name" || key === "status"
                  ? 80
                  : 120,
      );
  }

  const db = await getDb();
  const [target] = await db
    .select()
    .from(schema.ccsUsers)
    .where(eq(schema.ccsUsers.id, targetUserId))
    .limit(1);
  if (!target) return { error: "not_found", status: 404 };
  if (
    expectedVersion !== undefined &&
    expectedVersion !== Number(target.version)
  )
    throw new RequestError("Account changed. Reload before saving.", 409);
  if (!canManageUser(actor, target, "profile"))
    return { error: "forbidden", status: 403 };

  const prevBase =
    typeof target.profile === "object" && target.profile ? target.profile : {};
  const baseline = { ...DEFAULT_PROFILE, ...prevBase, id: target.id };
  const next = { ...baseline };

  try {
    for (const [k, v] of Object.entries(incoming)) {
      if (!STAFF_PROFILE_PATCH_KEYS.has(k)) continue;

      if (k === "handle") {
        const h = String(v ?? "")
          .trim()
          .replace(/[^\w.]/g, "_")
          .slice(0, 32);
        next.handle = h || baseline.handle || next.handle;
      } else if (k === "name") next.name = String(v ?? "").slice(0, 80);
      else if (k === "bio") next.bio = String(v ?? "").slice(0, 280);
      else if (k === "status") next.status = String(v ?? "").slice(0, 80);
      else if (k === "badges") {
        const arr = Array.isArray(v) ? v : [];
        next.badges = arr
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .slice(0, 8);
      } else if (k === "publicRoleBadge") {
        next.publicRoleBadge = sanitizePublicRoleBadge(v);
      } else if (k === "signature")
        next.signature = String(v ?? "").slice(0, 280);
      else if (k === "signatureLink") {
        const s = String(v ?? "")
          .trim()
          .slice(0, 4096);
        next.signatureLink = /^https?:\/\//i.test(s) ? s : "";
      } else if (
        k === "signatureImage" ||
        k === "avatarImage" ||
        k === "bannerImage"
      )
        next[k] = clampMediaField(k, v);
      else if (k === "college") next.college = String(v ?? "").slice(0, 120);
      else if (
        k === "program" ||
        k === "year" ||
        k === "campus" ||
        k === "focus" ||
        k === "org"
      )
        next[k] = String(v ?? "").slice(0, 120);
      else if (
        k === "avatarColor" ||
        k === "avatarAccent" ||
        k === "bannerColor" ||
        k === "bannerAccent"
      ) {
        next[k] = String(v ?? "").slice(0, 36);
      }
    }
  } catch (e) {
    return { error: e.message || "Image too large.", status: 413 };
  }

  if (await isHandleTakenElsewhere(db, next.handle, targetUserId))
    return {
      error: "handle_taken",
      status: 409,
      message: "That username handle is already in use.",
    };

  const fieldOpts = await getMergedProfileFieldOptions();
  sanitizeProfileSelectFields(next, fieldOpts);
  next.university = CCS_OLFU_UNIVERSITY;
  /** Admin username changes don't reset student cooldown bookkeeping. */
  next.handleChangedAt = baseline.handleChangedAt;
  delete next.statusBadges;

  await auditedMutation(
    actor.id,
    "user_profile_staff_patch",
    targetUserId,
    "UPDATE ccs_users SET profile=$1::jsonb WHERE id=$2 AND version=$3",
    [JSON.stringify(next), targetUserId, target.version],
    { keys: Object.keys(incoming) },
  );

  return { user: await getUserDetailById(targetUserId) };
}

export async function setUserBanned(
  actor,
  targetUserId,
  banned,
  reason = "",
  expectedVersion,
) {
  const db = await getDb();
  const [target] = await db
    .select()
    .from(schema.ccsUsers)
    .where(eq(schema.ccsUsers.id, targetUserId))
    .limit(1);
  if (!target) return { error: "not_found", status: 404 };
  if (
    expectedVersion !== undefined &&
    expectedVersion !== Number(target.version)
  )
    throw new RequestError("Account changed. Reload before saving.", 409);
  if (!canManageUser(actor, target, "ban"))
    return { error: "forbidden", status: 403 };
  if (target.id === actor.id)
    return {
      error: "self_ban",
      status: 409,
      message: "You cannot ban yourself.",
    };
  if (target.role === ROLE_ADMIN && actor.role !== ROLE_ADMIN)
    return { error: "forbidden", status: 403 };

  booleanField(banned, "Banned");
  const note = textField(reason, "Ban reason", 240);
  await auditedMutation(
    actor.id,
    banned ? "user_ban" : "user_unban",
    targetUserId,
    "UPDATE ccs_users SET banned=$1,banned_reason=$2,banned_at=$3 WHERE id=$4 AND version=$5",
    [
      banned,
      banned ? note : "",
      banned ? Date.now() : null,
      targetUserId,
      target.version,
    ],
    { reason: note },
  );

  return { user: await getUserDetailById(targetUserId) };
}

export async function deleteUserCascade(actor, targetUserId) {
  if (actor.role !== ROLE_ADMIN) return { error: "forbidden", status: 403 };
  if (actor.id === targetUserId)
    return {
      error: "self_delete",
      status: 409,
      message: "Use the account settings to delete your own account.",
    };

  const db = await getDb();
  const [target] = await db
    .select()
    .from(schema.ccsUsers)
    .where(eq(schema.ccsUsers.id, targetUserId))
    .limit(1);
  if (!target) return { error: "not_found", status: 404 };
  if (!canManageUser(actor, target, "delete"))
    return { error: "forbidden", status: 403 };

  if (target.role === ROLE_ADMIN) {
    const adminCount = await countAdmins();
    if (adminCount <= 1)
      return {
        error: "last_admin",
        status: 409,
        message: "Cannot delete the only remaining admin.",
      };
  }

  // FK cascades, report snapshots, counters and audit share one transaction.
  // Historical announcements and report evidence retain their attribution IDs.
  await auditedMutation(
    actor.id,
    "user_delete",
    targetUserId,
    "DELETE FROM ccs_users WHERE id=$1 AND version=$2",
    [targetUserId, target.version],
  );

  return { ok: true };
}

/** ---------- posts (admin) ---------- */
export async function listAllPosts({ q = "" } = {}) {
  const db = await getDb();
  const text = String(q || "").trim();
  const rows = await (text
    ? db
        .select()
        .from(schema.ccsPosts)
        .where(ilike(schema.ccsPosts.content, `%${text}%`))
        .orderBy(desc(schema.ccsPosts.createdAt))
    : db
        .select()
        .from(schema.ccsPosts)
        .orderBy(desc(schema.ccsPosts.createdAt)));
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    version: Number(r.version || 0),
    content: r.content,
    tag: r.tag,
    imageUrl: r.imageUrl || "",
    createdAt: Number(r.createdAt) || 0,
    pinned: !!r.pinned,
    likedBy: Array.isArray(r.likedBy) ? r.likedBy : [],
    commentCount: Number(r.commentCount ?? 0),
  }));
}

export async function adminPatchPost(actor, postId, patch) {
  if (!STAFF_ROLES.has(actor.role)) return { error: "forbidden", status: 403 };
  objectBody(patch, ["pinned", "content", "expectedVersion", "reason"]);
  if (!("pinned" in patch) && !("content" in patch))
    throw new RequestError("No post changes supplied.");
  const db = await getDb();
  const [post] = await db
    .select()
    .from(schema.ccsPosts)
    .where(eq(schema.ccsPosts.id, postId))
    .limit(1);
  if (!post) return { error: "not_found", status: 404 };
  const content =
    "content" in patch ? await validateContent(patch.content) : post.content;
  const pinned =
    "pinned" in patch ? booleanField(patch.pinned, "Pinned") : post.pinned;
  const reason =
    "reason" in patch
      ? textField(patch.reason, "Reason", 500)
      : "Staff moderation";
  const version = patch.expectedVersion ?? post.version;
  const saved = await auditedMutation(
    actor.id,
    "post_update",
    postId,
    `UPDATE ccs_posts SET content=$1,pinned=$2 WHERE id=$3 AND version=$4`,
    [content, pinned, postId, version],
    {
      reason,
      fields: Object.keys(patch).filter((key) => key !== "expectedVersion"),
    },
    { kind: "post", value: post, reason },
  );
  return {
    ok: true,
    post: {
      ...saved,
      userId: saved.user_id,
      imageUrl: saved.image_url,
      createdAt: Number(saved.created_at),
      version: Number(saved.version),
      commentCount: Number(saved.comment_count),
    },
  };
}
export async function adminPinPost(actor, id, pinned) {
  return adminPatchPost(actor, id, { pinned });
}
export async function adminEditPost(actor, id, content) {
  return adminPatchPost(actor, id, { content });
}
export async function adminDeletePost(actor, postId) {
  if (!STAFF_ROLES.has(actor.role)) return { error: "forbidden", status: 403 };
  const db = await getDb();
  const [post] = await db
    .select()
    .from(schema.ccsPosts)
    .where(eq(schema.ccsPosts.id, postId))
    .limit(1);
  if (!post) return { error: "not_found", status: 404 };
  await auditedMutation(
    actor.id,
    "post_delete",
    postId,
    "DELETE FROM ccs_posts WHERE id=$1 AND version=$2",
    [postId, post.version],
    {},
    { kind: "post", value: post, reason: "Post removed by staff" },
  );
  return { ok: true };
}

/** ---------- overview ---------- */
function pickSqlBigint(result, key) {
  const rows = Array.isArray(result) ? result : result?.rows;
  const row = rows?.[0];
  if (!row || typeof row !== "object") return null;
  const v = row[key] ?? row[key.toUpperCase()];
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function maskDatabaseHost(url) {
  try {
    const u = new URL(url);
    const user = u.username ? "••••" : "";
    const pass = u.password ? ":••••" : "";
    return `${u.protocol}//${user}${pass}${user || pass ? "@" : ""}${u.hostname}${u.pathname || ""}`;
  } catch {
    return "configured";
  }
}

let opsCache = null;
let opsPending = null;

async function opsDatabaseSnapshot(db) {
  if (opsCache && Date.now() - opsCache.at < 60_000) return opsCache.value;
  if (opsPending) return opsPending;
  opsPending = (async () => {
    const now = Date.now();
    const [counters, storage] = await Promise.all([
      db.execute(sql`SELECT
        (SELECT COUNT(*) FROM ccs_sessions) AS sessions_total,
        (SELECT COUNT(*) FROM ccs_sessions WHERE expires_at > ${now}) AS sessions_active,
        (SELECT COUNT(*) FROM ccs_announcements) AS announcements,
        (SELECT COUNT(*) FROM ccs_tickets) AS tickets,
        (SELECT COUNT(*) FROM ccs_tickets WHERE status = 'open') AS tickets_open,
        (SELECT COUNT(*) FROM ccs_audit_log) AS audit_rows,
        (SELECT COUNT(*) FROM ccs_reports WHERE status='open') AS reports_open`),
      db
        .execute(
          sql`SELECT pg_database_size(current_database())::bigint AS database_size,
        (SELECT COALESCE(SUM(pg_total_relation_size(c.oid)), 0) FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind IN ('r','m')) AS relation_size,
        (SELECT COALESCE(SUM(OCTET_LENGTH(content)), 0) FROM ccs_posts) AS posts_bytes,
        (SELECT COALESCE(SUM(OCTET_LENGTH(body)), 0) FROM ccs_comments) AS comments_bytes`,
        )
        .catch(() => null),
    ]);
    const value = {
      sessTotal: pickSqlBigint(counters, "sessions_total"),
      sessActive: pickSqlBigint(counters, "sessions_active"),
      announcementsN: pickSqlBigint(counters, "announcements"),
      ticketsN: pickSqlBigint(counters, "tickets"),
      ticketsOpen: pickSqlBigint(counters, "tickets_open"),
      auditRows: pickSqlBigint(counters, "audit_rows"),
      reportsOpen: pickSqlBigint(counters, "reports_open"),
      databaseSizeBytes: pickSqlBigint(storage, "database_size"),
      relationStorageBytes: pickSqlBigint(storage, "relation_size"),
      postsTextBytes: pickSqlBigint(storage, "posts_bytes"),
      commentsTextBytes: pickSqlBigint(storage, "comments_bytes"),
    };
    opsCache = { at: Date.now(), value };
    return value;
  })();
  try {
    return await opsPending;
  } finally {
    opsPending = null;
  }
}

async function gatherOpsDiagnostics(db) {
  const mem = process.memoryUsage();
  const {
    sessTotal,
    sessActive,
    announcementsN,
    ticketsN,
    ticketsOpen,
    auditRows,
    reportsOpen,
    databaseSizeBytes,
    relationStorageBytes,
    postsTextBytes,
    commentsTextBytes,
  } = await opsDatabaseSnapshot(db);

  const dbUrl = process.env.DATABASE_URL || "";

  let timeZone = "";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    timeZone = "";
  }

  return {
    server: {
      node: process.version,
      platform: process.platform,
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
      },
      timeZone,
    },
    storage: {
      databaseSizeBytes,
      relationStorageBytes,
      postsTextBytes,
      commentsTextBytes,
    },
    database: {
      hostMasked: dbUrl ? maskDatabaseHost(dbUrl) : "DATABASE_URL not set",
      activeSessions: Number(sessActive ?? 0),
      sessionsTotal: Number(sessTotal ?? 0),
      announcements: Number(announcementsN ?? 0),
      tickets: Number(ticketsN ?? 0),
      ticketsOpen: Number(ticketsOpen ?? 0),
      auditLogRows: Number(auditRows ?? 0),
      openReports: Number(reportsOpen ?? 0),
    },
    integrations: {
      transactionalEmail: !!String(process.env.RESEND_API_KEY || "").trim(),
      publicAppUrl: !!(publicAppBaseUrl() || process.env.VERCEL_URL),
      authPepperSet: !!String(process.env.CCS_AUTH_PEPPER || "").trim(),
      adminSelfRegistration: false,
    },
    api: {
      note: "REST handlers under src/app/api/* (Next.js App Router). Metrics are snapshot-only unless you add instrumentation.",
    },
  };
}

export async function getOverview() {
  const db = await getDb();
  const [totalsResult, audit] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) AS users,
      COUNT(*) FILTER (WHERE role = 'admin') AS admins,
      COUNT(*) FILTER (WHERE role = 'moderator') AS moderators,
      COUNT(*) FILTER (WHERE banned) AS banned,
      (SELECT COUNT(*) FROM ccs_posts) AS posts,
      (SELECT COUNT(*) FROM ccs_comments) AS comments FROM ccs_users`),
    db
      .select()
      .from(schema.ccsAuditLog)
      .orderBy(desc(schema.ccsAuditLog.createdAt))
      .limit(10),
  ]);

  let ops = null;
  try {
    ops = await gatherOpsDiagnostics(db);
  } catch {
    ops = { error: "Could not load ops snapshot." };
  }

  return {
    totals: Object.fromEntries(
      ["users", "admins", "moderators", "banned", "posts", "comments"].map(
        (key) => [key, pickSqlBigint(totalsResult, key) ?? 0],
      ),
    ),
    recentAudit: audit.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      action: r.action,
      targetId: r.targetId,
      meta: r.meta || {},
      createdAt: Number(r.createdAt) || 0,
    })),
    ops,
  };
}

/** ---------- landing CMS & public hero stats ---------- */
const LANDING_SETTINGS_KEY = "landing";

export async function getLandingCmsMerged() {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.ccsSiteSettings)
    .where(eq(schema.ccsSiteSettings.key, LANDING_SETTINGS_KEY))
    .limit(1);
  const stored = row?.value && typeof row.value === "object" ? row.value : {};
  return mergeLandingCms(stored);
}

export async function getPublicLandingBundle() {
  const db = await getDb();
  const [row] = resultRows(
    await db.execute(sql`SELECT
    (SELECT jsonb_build_object('value',value,'version',version,'updatedAt',updated_at) FROM ccs_site_settings WHERE key='landing') AS landing,
    (SELECT value FROM ccs_site_settings WHERE key='site') AS site,
    (SELECT COUNT(*) FROM ccs_users) AS members,
    (SELECT COUNT(*) FROM ccs_posts) AS threads,
    (SELECT COUNT(*) FROM ccs_presence WHERE last_seen > ${Date.now() - 24 * 60 * 60 * 1000}) AS active_today`),
  );
  const meta = row?.landing;
  const cms = mergeLandingCms(meta?.value || {});
  const raw = {
    members: Number(row?.members || 0),
    threads: Number(row?.threads || 0),
    activeToday: Number(row?.active_today || 0),
  };
  const siteForBadges = ensureBadgeRegistryAndColors({
    ...DEFAULT_SITE_SETTINGS,
    ...(row?.site || {}),
  });
  const stats = [
    {
      k: cms.statLabels.members,
      v: formatStatNumber(raw.members),
      raw: raw.members,
    },
    {
      k: cms.statLabels.threads,
      v: formatStatNumber(raw.threads),
      raw: raw.threads,
    },
    {
      k: cms.statLabels.activeToday,
      v: formatStatNumber(raw.activeToday),
      raw: raw.activeToday,
    },
  ];

  return {
    cms,
    stats,
    badgeColors:
      siteForBadges.badgeColors && typeof siteForBadges.badgeColors === "object"
        ? siteForBadges.badgeColors
        : {},
    tagColors:
      cms.tagColors && typeof cms.tagColors === "object" ? cms.tagColors : {},
    version: Number(meta?.version || 0),
    updatedAt: meta ? Number(meta.updatedAt) || null : null,
    counts: raw,
  };
}

/** ---------- announcements (staff write, public read) ---------- */
export async function listAnnouncementsPublic() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.ccsAnnouncements)
    .orderBy(
      desc(schema.ccsAnnouncements.pinned),
      desc(schema.ccsAnnouncements.createdAt),
    )
    .limit(100);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: !!r.pinned,
    version: Number(r.version || 0),
    authorId: r.authorId,
    createdAt: Number(r.createdAt) || 0,
  }));
}

export async function createAnnouncementAdmin(actor, body) {
  if (actor.role !== ROLE_ADMIN) return { error: "forbidden", status: 403 };
  objectBody(body, ["title", "body", "pinned"]);
  const title = textField(body.title, "Title", 200, { empty: false });
  const text = textField(body.body ?? "", "Announcement", 8000);
  const pinned = booleanField(body.pinned ?? false, "Pinned");
  const id = `an_${randomUUID()}`;
  await auditedMutation(
    actor.id,
    "announcement_create",
    id,
    "INSERT INTO ccs_announcements(id,title,body,pinned,author_id,created_at) VALUES($1,$2,$3,$4,$5,$6)",
    [id, title, text, pinned, actor.id, Date.now()],
  );
  return {
    announcement: (await listAnnouncementsPublic()).find(
      (row) => row.id === id,
    ),
  };
}
export async function patchAnnouncementAdmin(actor, id, patch) {
  if (actor.role !== ROLE_ADMIN) return { error: "forbidden", status: 403 };
  objectBody(patch, ["title", "body", "pinned", "expectedVersion"]);
  if (!["title", "body", "pinned"].some((key) => key in patch))
    throw new RequestError("No announcement changes supplied.");
  const db = await getDb();
  const [prev] = await db
    .select()
    .from(schema.ccsAnnouncements)
    .where(eq(schema.ccsAnnouncements.id, id))
    .limit(1);
  if (!prev) return { error: "not_found", status: 404 };
  const title =
    "title" in patch
      ? textField(patch.title, "Title", 200, { empty: false })
      : prev.title;
  const body =
    "body" in patch ? textField(patch.body, "Announcement", 8000) : prev.body;
  const pinned =
    "pinned" in patch ? booleanField(patch.pinned, "Pinned") : prev.pinned;
  await auditedMutation(
    actor.id,
    "announcement_update",
    id,
    "UPDATE ccs_announcements SET title=$1,body=$2,pinned=$3 WHERE id=$4 AND version=$5",
    [title, body, pinned, id, patch.expectedVersion ?? prev.version],
    {},
    { kind: "announcement", value: prev, reason: "Before staff edit" },
  );
  return {
    announcement: (await listAnnouncementsPublic()).find(
      (row) => row.id === id,
    ),
  };
}
export async function deleteAnnouncementAdmin(actor, id) {
  if (actor.role !== ROLE_ADMIN) return { error: "forbidden", status: 403 };
  const db = await getDb();
  const [prev] = await db
    .select()
    .from(schema.ccsAnnouncements)
    .where(eq(schema.ccsAnnouncements.id, id))
    .limit(1);
  if (!prev) return { error: "not_found", status: 404 };
  await auditedMutation(
    actor.id,
    "announcement_delete",
    id,
    "DELETE FROM ccs_announcements WHERE id=$1 AND version=$2",
    [id, prev.version],
    {},
    { kind: "announcement", value: prev, reason: "Removed by staff" },
  );
  return { ok: true };
}

/** ---------- ticketing (moderators + admins) ---------- */
export async function listTicketsAdmin({ status = "" } = {}) {
  const db = await getDb();
  const st = String(status || "").trim();
  const rows = await (st
    ? db
        .select()
        .from(schema.ccsTickets)
        .where(eq(schema.ccsTickets.status, st))
        .orderBy(desc(schema.ccsTickets.updatedAt))
    : db
        .select()
        .from(schema.ccsTickets)
        .orderBy(desc(schema.ccsTickets.updatedAt)));
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      version: Number(r.version || 0),
      messages: await ticketMessages(r.id),
      userId: r.userId,
      subject: r.subject,
      body: r.body,
      status: r.status,
      staffReply: r.staffReply,
      createdAt: Number(r.createdAt) || 0,
      updatedAt: Number(r.updatedAt) || 0,
    })),
  );
}

export async function ticketMessages(ticketId) {
  return resultRows(
    await queryDb(
      `SELECT id,author_id AS "authorId",body,created_at AS "createdAt" FROM ccs_ticket_messages WHERE ticket_id=$1 ORDER BY created_at,id`,
      [ticketId],
    ),
  );
}
export async function updateTicketStaff(actor, ticketId, patch = {}) {
  if (!STAFF_ROLES.has(actor.role)) return { error: "forbidden", status: 403 };
  objectBody(patch, [
    "status",
    "message",
    "staffReply",
    "requestId",
    "expectedVersion",
  ]);
  const db = await getDb();
  const [prev] = await db
    .select()
    .from(schema.ccsTickets)
    .where(eq(schema.ccsTickets.id, ticketId))
    .limit(1);
  if (!prev) return { error: "not_found", status: 404 };
  const status = patch.status ?? prev.status;
  if (!["open", "in_progress", "closed"].includes(status))
    throw new RequestError("Invalid ticket status.");
  const body = textField(
    patch.message ??
      (patch.staffReply !== prev.staffReply ? patch.staffReply : "") ??
      "",
    "Reply",
    4000,
  );
  if (!body && status === prev.status)
    throw new RequestError("Write a reply or change the ticket status.");
  const requestId = body
    ? textField(patch.requestId, "Request id", 100, { empty: false })
    : "";
  if (
    body &&
    resultRows(
      await queryDb(
        "SELECT id FROM ccs_ticket_messages WHERE ticket_id=$1 AND request_id=$2",
        [ticketId, requestId],
      ),
    ).length
  )
    return { ticket: { ...prev, messages: await ticketMessages(ticketId) } };
  await auditedMutation(
    actor.id,
    "ticket_update",
    ticketId,
    "UPDATE ccs_tickets SET status=$1,staff_reply=$2,updated_at=$3 WHERE id=$4 AND version=$5",
    [
      status,
      body || prev.staffReply,
      Date.now(),
      ticketId,
      patch.expectedVersion ?? prev.version,
    ],
    { status, replied: !!body },
    null,
    body ? { body, requestId } : null,
  );
  const [ticket] = await db
    .select()
    .from(schema.ccsTickets)
    .where(eq(schema.ccsTickets.id, ticketId))
    .limit(1);
  return { ticket: { ...ticket, messages: await ticketMessages(ticketId) } };
}

function validateCms(value, template, path = "cms") {
  if (typeof template === "string") {
    textField(value, path, 4096);
    return;
  }
  if (typeof template === "number") {
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new RequestError(`${path} must be a number.`);
    return;
  }
  if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length > 64)
      throw new RequestError(
        `${path} must be an array with at most 64 entries.`,
      );
    value.forEach((item, index) =>
      validateCms(item, template[0] ?? "", `${path}[${index}]`),
    );
    return;
  }
  objectBody(value, Object.keys(template), { empty: true });
  for (const [key, item] of Object.entries(value))
    validateCms(item, template[key], `${path}.${key}`);
  if (path.includes("["))
    for (const key of Object.keys(template))
      if (!(key in value))
        throw new RequestError(`${path}.${key} is required.`);
}

export async function saveLandingCms(actorId, body) {
  objectBody(body);
  const candidate = body.cms !== undefined ? body.cms : body;
  const expectedVersion =
    body.cms !== undefined ? body.expectedVersion : undefined;
  if (body.cms !== undefined) objectBody(body, ["cms", "expectedVersion"]);
  objectBody(candidate);
  const template = defaultLandingCms();
  const { tagColors, ...rest } =
    candidate && typeof candidate === "object" ? candidate : {};
  validateCms(rest, template);
  if (tagColors !== undefined) {
    objectBody(tagColors, null, { empty: true });
    if (Object.keys(tagColors).length > 64)
      throw new RequestError("Too many tag colours.");
    for (const [key, value] of Object.entries(tagColors))
      if (
        !key.trim() ||
        typeof value !== "string" ||
        !/^#[a-f0-9]{6}$/i.test(value)
      )
        throw new RequestError("Invalid tag colour.");
  }
  if (candidate?.postTagOptions?.length === 0)
    throw new RequestError("At least one post tag is required.");
  const normalized = mergeLandingCms(candidate);
  const db = await getDb();
  const [current] = await db
    .select()
    .from(schema.ccsSiteSettings)
    .where(eq(schema.ccsSiteSettings.key, LANDING_SETTINGS_KEY))
    .limit(1);
  const saved = await auditedMutation(
    actorId,
    "landing_cms_update",
    LANDING_SETTINGS_KEY,
    `INSERT INTO ccs_site_settings(key,value,updated_at,updated_by) VALUES($1,$2::jsonb,$3,$4)
      ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by
      WHERE ccs_site_settings.version=$5`,
    [
      LANDING_SETTINGS_KEY,
      JSON.stringify(normalized),
      Date.now(),
      actorId,
      expectedVersion ?? current?.version ?? 0,
    ],
    {},
    current
      ? { kind: "landing", value: current.value, reason: "Before publication" }
      : null,
  );
  return { cms: normalized, version: Number(saved.version) };
}

export async function landingRevisions() {
  return resultRows(
    await queryDb(
      "SELECT id,actor_id,created_at,reason FROM ccs_content_revisions WHERE kind='landing' AND target_id=$1 ORDER BY created_at DESC,id DESC LIMIT 30",
      [LANDING_SETTINGS_KEY],
    ),
  );
}
export async function restoreLandingCms(actorId, id, expectedVersion) {
  const [revision] = resultRows(
    await queryDb(
      "SELECT value FROM ccs_content_revisions WHERE id=$1 AND kind='landing' AND target_id=$2",
      [id, LANDING_SETTINGS_KEY],
    ),
  );
  if (!revision) throw new RequestError("Revision not found.", 404);
  return saveLandingCms(actorId, { cms: revision.value, expectedVersion });
}
export async function postModerationDetail(actor, postId) {
  if (!STAFF_ROLES.has(actor.role)) throw new RequestError("Forbidden.", 403);
  const db = await getDb();
  const [post] = await db
    .select()
    .from(schema.ccsPosts)
    .where(eq(schema.ccsPosts.id, postId))
    .limit(1);
  if (!post) throw new RequestError("Post not found.", 404);
  const [comments, revisions] = await Promise.all([
    queryDb(
      `SELECT c.id,c.body,c.image_url,c.user_id,c.created_at,(SELECT profile->>'name' FROM ccs_users WHERE id=c.user_id) AS author_name FROM ccs_comments c WHERE post_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`,
      [postId],
    ),
    queryDb(
      "SELECT id,actor_id,value,reason,created_at FROM ccs_content_revisions WHERE kind='post' AND target_id=$1 ORDER BY created_at DESC,id DESC LIMIT 20",
      [postId],
    ),
  ]);
  return {
    post,
    comments: resultRows(comments),
    revisions: resultRows(revisions),
  };
}
export async function removeCommentAsStaff(actor, postId, commentId, reason) {
  if (!STAFF_ROLES.has(actor.role)) throw new RequestError("Forbidden.", 403);
  const note = textField(reason, "Moderation reason", 500, { empty: false });
  const db = await getDb();
  const [comment] = await db
    .select()
    .from(schema.ccsComments)
    .where(
      and(
        eq(schema.ccsComments.id, commentId),
        eq(schema.ccsComments.postId, postId),
      ),
    )
    .limit(1);
  if (!comment) throw new RequestError("Comment not found.", 404);
  await auditedMutation(
    actor.id,
    "comment_delete",
    commentId,
    "DELETE FROM ccs_comments WHERE id=$1 AND post_id=$2 AND body=$3 AND image_url=$4",
    [commentId, postId, comment.body, comment.imageUrl],
    { postId, reason: note },
    { kind: "comment", value: comment, reason: note },
  );
  return { ok: true };
}
