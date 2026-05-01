import crypto, { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { DEFAULT_PROFILE } from "@/components/ccs-talks/config/appConfig";
import { and, asc, count, desc, eq, ilike, inArray, lt, lte, ne, or, sql } from "drizzle-orm";
import {
  CCS_DEFAULT_FRIENDS,
  CCS_DEFAULT_PREFS,
  CCS_DEFAULT_SUBS,
  normalizeActivities,
  normalizeFriends,
  normalizePrefs,
  normalizeSubs,
} from "./accountDefaults";
import { newPasswordRecord, verifyPassword } from "./auth";
import { authorProfilesByIds, buildFeed } from "./feed";
import { getDb } from "./drizzle-client";
import {
  CCS_OLFU_UNIVERSITY,
  USERNAME_CHANGE_COOLDOWN_MS,
  mergeProfileFieldOptions,
  sanitizeProfileSelectFields,
} from "./profileOptions";
import { toPublicProfile } from "./publicUser";
import {
  MAX_POST_COMMENT_IMAGE_DATA_URL_CHARS,
  MAX_PROFILE_MEDIA_DATA_URL_CHARS,
} from "./imageUploadLimits";
import { CCS_POST_BODY_MAX_CHARS } from "./postContentLimits";
import * as schema from "./schema";

const PRESENCE_WINDOW_MS = 120_000;

async function readMergedProfileFieldOptionsDb(db) {
  const [row] = await db.select().from(schema.ccsSiteSettings).where(eq(schema.ccsSiteSettings.key, "site")).limit(1);
  const patch = row?.value && typeof row.value === "object" ? row.value.profileFieldOptions : null;
  return mergeProfileFieldOptions(patch);
}

function coerceArr(x) {
  return Array.isArray(x) ? x : [];
}

function userRowToShim(row) {
  return {
    id: row.id,
    profile: row.profile,
    role: row.role || "student",
    bookmarkedPostIds: coerceArr(row.bookmarkedPostIds),
  };
}

/** Full record for credential checks */
export function userRowToDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordSalt: row.passwordSalt,
    passwordHash: row.passwordHash,
    profile: row.profile,
    bookmarkedPostIds: coerceArr(row.bookmarkedPostIds),
  };
}

function postRowToLegacy(row) {
  return {
    id: row.id,
    userId: row.userId,
    content: row.content,
    tag: row.tag,
    imageUrl: row.imageUrl || "",
    createdAt: row.createdAt,
    likedBy: coerceArr(row.likedBy),
    commentCount: Number(row.commentCount ?? 0),
    pinned: !!row.pinned,
  };
}

export async function purgeExpiredSessions(db) {
  const now = Date.now();
  await db.delete(schema.ccsSessions).where(lte(schema.ccsSessions.expiresAt, now));
}

async function enrichLegacyPostsOpenReportCounts(db, legacyPosts) {
  const ids = legacyPosts.map((p) => p?.id).filter(Boolean);
  if (!ids.length) return;
  const rows = await db
    .select({ postId: schema.ccsReports.postId, n: count() })
    .from(schema.ccsReports)
    .where(and(inArray(schema.ccsReports.postId, ids), eq(schema.ccsReports.status, "open")))
    .groupBy(schema.ccsReports.postId);
  const map = Object.fromEntries(rows.map((r) => [r.postId, Number(r.n ?? 0) || 0]));
  for (const p of legacyPosts) {
    if (p && p.id != null) p.openReportCount = map[String(p.id)] ?? 0;
  }
}

async function hydrateClientPosts(db, viewerUserId, legacyPosts) {
  await enrichLegacyPostsOpenReportCounts(db, legacyPosts);
  const idsNeeded = [...new Set(legacyPosts.map((p) => p.userId).filter(Boolean))];
  if (viewerUserId) idsNeeded.push(viewerUserId);
  const uniq = [...new Set(idsNeeded)];
  const userRows =
    uniq.length === 0
      ? []
      : await db.select().from(schema.ccsUsers).where(inArray(schema.ccsUsers.id, uniq));
  const shimUsers = userRows.map(userRowToShim);
  const shimDb = { users: shimUsers, posts: legacyPosts };
  return buildFeed(shimDb, viewerUserId, {}).posts;
}

const FEED_PAGE_DEFAULT = 30;
const FEED_PAGE_MAX = 100;

function encodeFeedCursor(row) {
  if (!row?.id) return null;
  const t = Number(row.createdAt);
  if (!Number.isFinite(t)) return null;
  return Buffer.from(JSON.stringify({ t, i: String(row.id) }), "utf8").toString("base64url");
}

function decodeFeedCursor(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const j = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    const t = Number(j.t);
    const i = String(j.i || "").trim();
    if (!Number.isFinite(t) || !i) return null;
    return { createdAt: t, id: i };
  } catch {
    return null;
  }
}

/**
 * Public feed with cursor pagination (newest first; stable tie-break on `id`).
 * @param {string|null} viewerUserId
 * @param {string} [tagFilter]  "All" or omit = no tag filter
 * @param {{ limit?: number, cursor?: string|null }} [opts]
 */
export async function fetchPublicFeed(viewerUserId, tagFilter, opts = {}) {
  const db = await getDb();
  await purgeExpiredSessions(db);

  let limit = Number(opts.limit);
  if (!Number.isFinite(limit) || limit < 1) limit = FEED_PAGE_DEFAULT;
  if (limit > FEED_PAGE_MAX) limit = FEED_PAGE_MAX;

  const cursor = decodeFeedCursor(opts.cursor);

  const parts = [];
  if (tagFilter && tagFilter !== "All") {
    parts.push(eq(schema.ccsPosts.tag, String(tagFilter).trim()));
  }
  if (cursor) {
    parts.push(
      or(
        lt(schema.ccsPosts.createdAt, cursor.createdAt),
        and(eq(schema.ccsPosts.createdAt, cursor.createdAt), lt(schema.ccsPosts.id, cursor.id))
      )
    );
  }

  let q = db.select().from(schema.ccsPosts);
  if (parts.length === 1) q = q.where(parts[0]);
  else if (parts.length > 1) q = q.where(and(...parts));

  const rows = await q.orderBy(desc(schema.ccsPosts.createdAt), desc(schema.ccsPosts.id)).limit(limit + 1);
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && slice.length ? encodeFeedCursor(slice[slice.length - 1]) : null;

  const legacy = slice.map(postRowToLegacy);
  await enrichLegacyPostsOpenReportCounts(db, legacy);

  /** Viewer bookmarks / likedBy flags need viewer row merged into shim. */
  const idsNeeded = [...new Set(slice.map((r) => r.userId).filter(Boolean))];
  if (viewerUserId) idsNeeded.push(viewerUserId);
  const uniq = [...new Set(idsNeeded)];

  const userRows =
    uniq.length === 0
      ? []
      : await db.select().from(schema.ccsUsers).where(inArray(schema.ccsUsers.id, uniq));
  const shimUsers = userRows.map(userRowToShim);

  const shimDb = { users: shimUsers, posts: legacy };
  const built = buildFeed(shimDb, viewerUserId, { tagFilter: tagFilter && tagFilter !== "All" ? tagFilter : null });
  return { ...built, nextCursor };
}

export async function resolveViewerFromSession(token) {
  const db = await getDb();
  await purgeExpiredSessions(db);
  if (!token) return null;
  const [sess] = await db.select().from(schema.ccsSessions).where(eq(schema.ccsSessions.token, token)).limit(1);
  if (!sess) return null;
  const [userRow] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, sess.userId)).limit(1);
  return userRowToDomain(userRow);
}

export async function findUserByEmail(email) {
  const db = await getDb();
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  const [row] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.email, e)).limit(1);
  return userRowToDomain(row);
}

export function makeUserId() {
  return `u_${Math.random().toString(16).slice(2, 10)}`;
}

export function makeSessionToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function uniqueHandle(db, candidate) {
  const base = candidate || "student";
  const rows = await db.select({ profile: schema.ccsUsers.profile }).from(schema.ccsUsers);
  const taken = new Set(
    rows
      .map((r) => (r.profile && typeof r.profile === "object" ? r.profile.handle : "") || "")
      .filter(Boolean)
      .map((h) => h.toLowerCase())
  );

  let h = base;
  if (!taken.has(h.toLowerCase())) return h.slice(0, 32);

  let n = 0;
  h = `${base}_${Math.random().toString(16).slice(2, 6)}`;
  while (taken.has(h.toLowerCase()) && n < 24) {
    h = `${base}_${Math.random().toString(16).slice(2, 6)}`;
    n++;
  }
  return h.slice(0, 32);
}

/** Case-insensitive: is this handle already assigned to any user? */
export async function isHandleTaken(db, handle) {
  const h = String(handle || "").trim().toLowerCase();
  if (!h) return false;
  const rows = await db.select({ profile: schema.ccsUsers.profile }).from(schema.ccsUsers);
  for (const r of rows) {
    const ph = r.profile && typeof r.profile === "object" ? r.profile.handle : "";
    if (String(ph || "").trim().toLowerCase() === h) return true;
  }
  return false;
}

/** Clamp optional post/comment image: data URL (~250 KB max) or https URL. */
export function clampPostCommentImageUrl(raw) {
  if (raw == null || raw === "") return "";
  const v = typeof raw === "string" ? raw : String(raw);
  if (/^data:image\//i.test(v)) {
    if (v.length > MAX_POST_COMMENT_IMAGE_DATA_URL_CHARS) {
      throw new Error(
        `Image is too large for storage (${Math.round(v.length / 1024)} KB). Max ~${Math.round(MAX_POST_COMMENT_IMAGE_DATA_URL_CHARS / 1024)} KB, or paste an external https URL.`,
      );
    }
    return v;
  }
  if (/^https?:\/\//i.test(v)) {
    return v.slice(0, 4096);
  }
  return v.slice(0, 4096);
}

export async function insertSession(db, userId, maxAgeDays = 14) {
  const token = makeSessionToken();
  const expiresAt = Date.now() + maxAgeDays * 24 * 60 * 60 * 1000;
  await db.insert(schema.ccsSessions).values({ token, userId, expiresAt });
  return { token, expiresAt };
}

function isUniqueViolation(err) {
  const c = err?.code ?? err?.cause?.code;
  return c === "23505" || String(c) === "23505";
}

function sanitizeRequestedHandle(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^\w.]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

/**
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @param {string} [emailLocalSuggested] — legacy: handle seed from email local-part
 * @param {{ requestedHandle?: string }} [opts]
 */
export async function registerAccountRow(email, password, name, emailLocalSuggested, opts = {}) {
  const db = await getDb();
  if (await findUserByEmail(email)) return { conflict: true };

  const id = makeUserId();
  const { salt, hash } = newPasswordRecord(password);

  const explicit = sanitizeRequestedHandle(opts.requestedHandle || "");
  const fromEmail = String(emailLocalSuggested || "student")
    .replace(/[^\w.]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28)
    .toLowerCase() || "student";

  let handle;
  if (explicit) {
    if (await isHandleTaken(db, explicit)) return { handleTaken: true };
    handle = explicit;
  } else {
    handle = await uniqueHandle(db, fromEmail);
  }

  const profile = { ...DEFAULT_PROFILE, id, name, handle };
  profile.university = CCS_OLFU_UNIVERSITY;

  try {
    await db.insert(schema.ccsUsers).values({
      id,
      email,
      passwordSalt: salt,
      passwordHash: hash,
      profile,
      bookmarkedPostIds: [],
      prefs: { ...CCS_DEFAULT_PREFS, onboardingCompleted: false },
      friendsState: CCS_DEFAULT_FRIENDS,
      subsState: CCS_DEFAULT_SUBS,
      activities: [],
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { conflict: true };
    throw e;
  }

  const sess = await insertSession(db, id);
  return { profile, token: sess.token, expiresAt: sess.expiresAt };
}

export async function loginAccountRow(email, password) {
  const db = await getDb();
  await purgeExpiredSessions(db);

  const user = await findUserByEmail(email);
  if (!user) return { fail: true };
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) return { fail: true };

  /** Block banned users from re-establishing a session. */
  const [row] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, user.id)).limit(1);
  if (row?.banned) return { banned: true, reason: row.bannedReason || "" };

  const sess = await insertSession(db, user.id);
  return { profile: user.profile, token: sess.token, expiresAt: sess.expiresAt };
}

export async function revokeSessionToken(token) {
  const db = await getDb();
  if (!token) return;
  await db.delete(schema.ccsSessions).where(eq(schema.ccsSessions.token, token));
}

export async function clientPostPreview(viewerUserId, postId) {
  const db = await getDb();
  const [row] = await db.select().from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!row) return null;
  const legacy = postRowToLegacy(row);
  const cards = await hydrateClientPosts(db, viewerUserId, [legacy]);
  return cards[0] ?? null;
}

/** Single post + author (and viewer when signed in) for deep links `/p/{id}`. */
export async function fetchSinglePostEnvelope(viewerUserId, postId) {
  const db = await getDb();
  const [row] = await db.select().from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!row) return null;
  const legacy = postRowToLegacy(row);
  const cards = await hydrateClientPosts(db, viewerUserId, [legacy]);
  const post = cards[0];
  if (!post) return null;
  const ids = [post.userId];
  if (viewerUserId) ids.push(viewerUserId);
  const uniq = [...new Set(ids.filter(Boolean))];
  const userRows = uniq.length === 0 ? [] : await db.select().from(schema.ccsUsers).where(inArray(schema.ccsUsers.id, uniq));
  const shimUsers = userRows.map(userRowToShim);
  const users = authorProfilesByIds({ users: shimUsers, posts: [legacy] }, uniq);
  return { post, users };
}

export async function createUserPost(viewerUserId, content, tag, imageUrl = "") {
  const body = String(content || "").trim();
  if (body.length > CCS_POST_BODY_MAX_CHARS) return { contentTooLarge: true };
  const db = await getDb();
  let clampedImage = "";
  try {
    clampedImage = clampPostCommentImageUrl(imageUrl);
  } catch {
    return { imageTooLarge: true };
  }
  const id = `p_${randomUUID()}`;
  const now = Date.now();
  await db.insert(schema.ccsPosts).values({
    id,
    userId: viewerUserId,
    content,
    tag: tag || "General",
    imageUrl: clampedImage,
    createdAt: now,
    likedBy: [],
    commentCount: 0,
    pinned: false,
  });

  /** Return hydrated single card */
  return clientPostPreview(viewerUserId, id);
}

export async function updatePostBody(postId, ownerUserId, content) {
  const body = String(content || "").trim();
  if (body.length > CCS_POST_BODY_MAX_CHARS) return { contentTooLarge: true };
  const db = await getDb();
  const [existing] = await db.select().from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!existing) return { missing: true };
  if (existing.userId !== ownerUserId) return { forbidden: true };

  await db.update(schema.ccsPosts).set({ content: body }).where(eq(schema.ccsPosts.id, postId));

  return { post: await clientPostPreview(ownerUserId, postId) };
}

export async function togglePostLikeDb(postId, viewerUserId) {
  const db = await getDb();
  const [postRow] = await db.select().from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!postRow) return { missing: true };

  let likedBy = coerceArr(postRow.likedBy);
  const idx = likedBy.indexOf(viewerUserId);
  if (idx >= 0) likedBy = likedBy.filter((uid) => uid !== viewerUserId);
  else likedBy = [...likedBy, viewerUserId];

  await db.update(schema.ccsPosts).set({ likedBy }).where(eq(schema.ccsPosts.id, postId));
  return { post: await clientPostPreview(viewerUserId, postId) };
}

export async function toggleBookmarkDb(postId, viewerUserId) {
  const db = await getDb();
  const [postRow] = await db.select().from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!postRow) return { missing: true };

  const [userRow] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, viewerUserId)).limit(1);
  if (!userRow) return { unauthorized: true };

  const set = new Set(coerceArr(userRow.bookmarkedPostIds));
  if (set.has(postId)) set.delete(postId);
  else set.add(postId);
  const next = Array.from(set);

  await db
    .update(schema.ccsUsers)
    .set({ bookmarkedPostIds: next })
    .where(eq(schema.ccsUsers.id, viewerUserId));

  return { post: await clientPostPreview(viewerUserId, postId) };
}

export async function listCommentsEnvelope(postId) {
  const db = await getDb();
  const [postExists] = await db.select({ id: schema.ccsPosts.id }).from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!postExists) return null;

  const rows = await db
    .select()
    .from(schema.ccsComments)
    .where(eq(schema.ccsComments.postId, postId))
    .orderBy(asc(schema.ccsComments.createdAt));

  const ids = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  const userRows =
    ids.length === 0
      ? []
      : await db.select().from(schema.ccsUsers).where(inArray(schema.ccsUsers.id, ids));

  const shimUsers = userRows.map(userRowToShim);
  const users = authorProfilesByIds({ users: shimUsers, posts: [] }, ids);

  return {
    mapped: rows.map((c) => ({
      id: c.id,
      userId: c.userId,
      text: c.body,
      ts: c.createdAt,
      imageUrl: c.imageUrl || "",
      parentId: c.parentId && String(c.parentId).trim() ? String(c.parentId).trim() : null,
    })),
    users,
  };
}

export async function addCommentEnvelope(postId, viewerUserId, text, imageUrl = "", parentIdRaw = null) {
  const db = await getDb();

  const bodyText = String(text || "").trim();
  if (!bodyText) return { empty: true };
  if (bodyText.length > CCS_COMMENT_BODY_MAX_CHARS) return { tooLong: true };

  const [postRow] = await db.select().from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!postRow) return { missing: true };

  let resolvedParentId = null;
  const rawParent = typeof parentIdRaw === "string" ? parentIdRaw.trim() : "";
  if (rawParent) {
    const [parentRow] = await db.select().from(schema.ccsComments).where(eq(schema.ccsComments.id, rawParent)).limit(1);
    if (!parentRow || parentRow.postId !== postId) return { missingParent: true };
    const pPid = parentRow.parentId && String(parentRow.parentId).trim();
    resolvedParentId = pPid || parentRow.id;
  }

  let clampedImage = "";
  try {
    clampedImage = clampPostCommentImageUrl(imageUrl);
  } catch {
    return { imageTooLarge: true };
  }

  const id = `c_${randomUUID()}`;
  const createdAt = Date.now();

  await db.insert(schema.ccsComments).values({
    id,
    postId,
    userId: viewerUserId,
    parentId: resolvedParentId,
    body: bodyText,
    imageUrl: clampedImage,
    createdAt,
  });

  const nextCount = Number(postRow.commentCount ?? 0) + 1;
  await db.update(schema.ccsPosts).set({ commentCount: nextCount }).where(eq(schema.ccsPosts.id, postId));

  const postCard = await clientPostPreview(viewerUserId, postId);

  const commentRows = await db
    .select()
    .from(schema.ccsComments)
    .where(eq(schema.ccsComments.postId, postId));
  const ids = [...new Set(commentRows.map((r) => r.userId).filter(Boolean))];
  const userRows =
    ids.length === 0 ? [] : await db.select().from(schema.ccsUsers).where(inArray(schema.ccsUsers.id, ids));
  const shimUsers = userRows.map(userRowToShim);
  const users = authorProfilesByIds({ users: shimUsers, posts: [] }, ids);

  return {
    comment: { id, userId: viewerUserId, text: bodyText, ts: createdAt, imageUrl: clampedImage, parentId: resolvedParentId },
    post: postCard,
    users,
  };
}

export async function updateCommentEnvelope(postId, commentId, viewerUserId, text) {
  const db = await getDb();
  const bodyText = String(text || "").trim();
  if (!bodyText) return { empty: true };
  if (bodyText.length > CCS_COMMENT_BODY_MAX_CHARS) return { tooLong: true };

  const [row] = await db
    .select()
    .from(schema.ccsComments)
    .where(and(eq(schema.ccsComments.id, commentId), eq(schema.ccsComments.postId, postId)))
    .limit(1);
  if (!row) return { missing: true };
  if (row.userId !== viewerUserId) return { forbidden: true };

  await db.update(schema.ccsComments).set({ body: bodyText }).where(eq(schema.ccsComments.id, commentId));

  return {
    comment: {
      id: row.id,
      userId: row.userId,
      text: bodyText,
      ts: row.createdAt,
      imageUrl: row.imageUrl || "",
      parentId: row.parentId && String(row.parentId).trim() ? String(row.parentId).trim() : null,
    },
  };
}

export async function deleteCommentEnvelope(postId, commentId, viewerUserId) {
  const db = await getDb();
  const [postRow] = await db.select().from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!postRow) return { missingPost: true };

  const [row] = await db
    .select()
    .from(schema.ccsComments)
    .where(and(eq(schema.ccsComments.id, commentId), eq(schema.ccsComments.postId, postId)))
    .limit(1);
  if (!row) return { missing: true };
  if (row.userId !== viewerUserId) return { forbidden: true };

  await db.delete(schema.ccsComments).where(eq(schema.ccsComments.id, commentId));

  const nextCount = Math.max(0, Number(postRow.commentCount ?? 0) - 1);
  await db.update(schema.ccsPosts).set({ commentCount: nextCount }).where(eq(schema.ccsPosts.id, postId));

  const postCard = await clientPostPreview(viewerUserId, postId);
  return { ok: true, post: postCard };
}

const PROFILE_KEYS = new Set([
  "name",
  "handle",
  "college",
  "program",
  "year",
  "campus",
  "focus",
  "org",
  "bio",
  "signature",
  "signatureImage",
  "signatureLink",
  "avatarColor",
  "avatarAccent",
  "bannerColor",
  "bannerAccent",
  "avatarImage",
  "bannerImage",
]);

/** User + staff profile patch field names (values applied in `patchAccountBundles` / admin editor). */
export const PROFILE_PATCH_FIELD_KEYS = PROFILE_KEYS;

const MAX_REMOTE_IMAGE_URL_LEN = 4096;

export function clampMediaField(key, raw) {
  if (raw == null || raw === "") return "";
  const v = typeof raw === "string" ? raw : String(raw);
  if (/^data:image\//i.test(v)) {
    if (v.length > MAX_PROFILE_MEDIA_DATA_URL_CHARS) {
      const label =
        key === "avatarImage" ? "Avatar" : key === "signatureImage" ? "Signature image" : "Banner";
      throw new Error(`${label} upload is too large for server storage (${Math.round(v.length / 1024)} KB). Use a smaller image or an external URL.`);
    }
    return v;
  }
  if (/^https?:\/\//i.test(v)) {
    return v.slice(0, MAX_REMOTE_IMAGE_URL_LEN);
  }
  /** Allow chrome-style url() pasted without scheme-less — store as truncated text */
  return v.slice(0, MAX_REMOTE_IMAGE_URL_LEN);
}

export function accountWireFromRow(row) {
  const base = typeof row.profile === "object" && row.profile ? row.profile : {};
  const merged = { ...DEFAULT_PROFILE, ...base, id: row.id };
  merged.university = CCS_OLFU_UNIVERSITY;

  const hc = Number(merged.handleChangedAt || 0);
  /** Milliseconds timestamp when username can change again; null when allowed now (or never changed). */
  let usernameCooldownUntil = null;
  if (hc > 0 && Date.now() - hc < USERNAME_CHANGE_COOLDOWN_MS) {
    usernameCooldownUntil = hc + USERNAME_CHANGE_COOLDOWN_MS;
  }

  return {
    email: row.email || "",
    profile: toPublicProfile(merged),
    prefs: normalizePrefs(row.prefs),
    friends: normalizeFriends(row.friendsState),
    subs: normalizeSubs(row.subsState),
    activities: normalizeActivities(row.activities),
    role: row.role || "student",
    banned: !!row.banned,
    usernameCooldownUntil,
  };
}

export async function getAccountWire(token) {
  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return null;

  const db = await getDb();
  const [row] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, viewer.id)).limit(1);
  if (!row) return null;
  const wire = accountWireFromRow(row);
  wire.friends = await friendsWireFromDb(db, row);
  return wire;
}

/** Merge Postgres friend-request rows into the client friends envelope (truth for pending/outgoing). */
async function friendsWireFromDb(db, userRow) {
  const uid = userRow.id;
  const base = normalizeFriends(userRow.friendsState);
  const outbound = await db.select({ toUserId: schema.ccsFriendRequests.toUserId }).from(schema.ccsFriendRequests).where(eq(schema.ccsFriendRequests.fromUserId, uid));
  const inbound = await db
    .select({ fromUserId: schema.ccsFriendRequests.fromUserId })
    .from(schema.ccsFriendRequests)
    .where(eq(schema.ccsFriendRequests.toUserId, uid));
  return normalizeFriends({
    friends: [...new Set(base.friends.filter(Boolean))],
    pending: [...new Set(inbound.map((r) => String(r.fromUserId)).filter(Boolean))],
    outgoing: [...new Set(outbound.map((r) => String(r.toUserId)).filter(Boolean))],
  });
}

/** Resolve a user id from their public handle (case-insensitive, trimmed). */
export async function findUserIdByPublicHandle(handleRaw) {
  const h = String(handleRaw || "").trim().toLowerCase();
  if (!h) return null;
  const db = await getDb();
  const [hit] = await db
    .select({ id: schema.ccsUsers.id })
    .from(schema.ccsUsers)
    .where(sql`lower(trim(coalesce(${schema.ccsUsers.profile}->>'handle', ''))) = ${h}`)
    .limit(1);
  return hit?.id ?? null;
}

/** Same rows as {@link fetchVisitProfileBundle} but keyed by handle in the URL. */
export async function fetchVisitProfileBundleByHandle(handleRaw) {
  const uid = await findUserIdByPublicHandle(handleRaw);
  if (!uid) return null;
  return fetchVisitProfileBundle(uid);
}

/** Public card + friend's public profiles for Profile visit view (friends tab). */
export async function fetchVisitProfileBundle(visitUserId) {
  const uid = String(visitUserId || "").trim();
  if (!uid) return null;

  const db = await getDb();
  const [row] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, uid)).limit(1);
  if (!row) return null;

  const prev = typeof row.profile === "object" && row.profile ? row.profile : {};
  const merged = { ...DEFAULT_PROFILE, ...prev, id: row.id };
  merged.university = CCS_OLFU_UNIVERSITY;
  const profile = { ...toPublicProfile(merged), forumRole: row.role || "student" };

  const fs = normalizeFriends(row.friendsState);
  const friendIds = [...new Set((fs.friends || []).filter(Boolean))].slice(0, 72);

  let friendMiniUsers = {};
  if (friendIds.length > 0) {
    const fRows = await db.select().from(schema.ccsUsers).where(inArray(schema.ccsUsers.id, friendIds));
    for (const fr of fRows) {
      const mp = typeof fr.profile === "object" && fr.profile ? fr.profile : {};
      const m = { ...DEFAULT_PROFILE, ...mp, id: fr.id };
      m.university = CCS_OLFU_UNIVERSITY;
      friendMiniUsers[fr.id] = { ...toPublicProfile(m), forumRole: fr.role || "student" };
    }
  }

  return { profile, friendIds, friendMiniUsers };
}

export async function isHandleTakenElsewhere(db, handle, excludeUserId) {
  const h = String(handle || "").trim().toLowerCase();
  if (!h) return false;
  const others = await db
    .select({ id: schema.ccsUsers.id, profile: schema.ccsUsers.profile })
    .from(schema.ccsUsers)
    .where(ne(schema.ccsUsers.id, excludeUserId));
  for (const r of others) {
    const ph = r.profile && typeof r.profile === "object" ? r.profile.handle : "";
    if (String(ph || "").trim().toLowerCase() === h) return true;
  }
  return false;
}

/** Merge profile + optional prefs/friends/subs/activities payloads (authenticated user). */
export async function patchAccountBundles(userId, body) {
  const db = await getDb();
  const [row] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, userId)).limit(1);
  if (!row) return { unauthorized: true };

  const baseline = { ...DEFAULT_PROFILE, ...(typeof row.profile === "object" ? row.profile : {}), id: userId };
  let nextProfile = { ...baseline };

  const normalizeHandleLocal = (h) =>
    String(h || "")
      .replace(/[^\w.]/g, "_")
      .slice(0, 32);

  const prevHandleNorm = normalizeHandleLocal(baseline.handle);
  /** @type {number | undefined} */
  let handleChangedAtToSet;

  const patchProfile = body && typeof body.profile === "object" ? body.profile : null;
  if (patchProfile) {
    try {
      for (const [k, v] of Object.entries(patchProfile)) {
        if (!PROFILE_KEYS.has(k)) continue;
        if (k === "handle") {
          const fromPatch = normalizeHandleLocal(v);
          nextProfile.handle = fromPatch || prevHandleNorm || normalizeHandleLocal(nextProfile.handle) || "";

          const newNorm = normalizeHandleLocal(nextProfile.handle);
          if (newNorm && newNorm !== prevHandleNorm) {
            const last = Number(baseline.handleChangedAt || 0);
            if (last > 0 && Date.now() - last < USERNAME_CHANGE_COOLDOWN_MS) {
              return {
                usernameCooldown: true,
                nextAllowedAt: last + USERNAME_CHANGE_COOLDOWN_MS,
              };
            }
            handleChangedAtToSet = Date.now();
          }
        } else if (k === "name") nextProfile.name = String(v || "").slice(0, 80);
        else if (k === "bio") nextProfile.bio = String(v || "").slice(0, 280);
        else if (k === "signature") nextProfile.signature = String(v || "").slice(0, 280);
        else if (k === "signatureLink") {
          const s = String(v || "").trim().slice(0, 4096);
          nextProfile.signatureLink = /^https?:\/\//i.test(s) ? s : "";
        } else if (k === "avatarImage" || k === "bannerImage" || k === "signatureImage") nextProfile[k] = clampMediaField(k, v);
        else nextProfile[k] = v;
      }
    } catch (e) {
      return { mediaTooLarge: true, message: e.message };
    }

    if (await isHandleTakenElsewhere(db, nextProfile.handle, userId)) return { handleTaken: true };
  }

  const fieldOpts = await readMergedProfileFieldOptionsDb(db);
  sanitizeProfileSelectFields(nextProfile, fieldOpts);
  nextProfile.university = CCS_OLFU_UNIVERSITY;
  if (handleChangedAtToSet !== undefined) nextProfile.handleChangedAt = handleChangedAtToSet;

  const currPrefs = normalizePrefs(row.prefs);
  const currFriends = normalizeFriends(row.friendsState);
  const currSubs = normalizeSubs(row.subsState);
  const currActivities = normalizeActivities(row.activities);

  let nextPrefs = currPrefs;
  let nextFriends = currFriends;
  let nextSubs = currSubs;
  let nextActs = currActivities;

  if (body.prefs !== undefined && typeof body.prefs === "object") nextPrefs = normalizePrefs({ ...currPrefs, ...body.prefs });
  /** Friends pending/outgoing are managed via `/api/friends`; mutual list updates there (not via generic PATCH). */
  if (body.subs !== undefined && typeof body.subs === "object") {
    nextSubs = normalizeSubs({ ...currSubs, ...body.subs });
  }
  if (body.activities !== undefined) nextActs = normalizeActivities(body.activities);

  await db
    .update(schema.ccsUsers)
    .set({
      profile: nextProfile,
      prefs: nextPrefs,
      friendsState: nextFriends,
      subsState: nextSubs,
      activities: nextActs,
    })
    .where(eq(schema.ccsUsers.id, userId));

  const [fresh] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, userId)).limit(1);
  return { wire: fresh ? accountWireFromRow(fresh) : accountWireFromRow({ ...row, profile: nextProfile, prefs: nextPrefs }) };
}

export async function patchUserProfile(userId, body) {
  const merged = await patchAccountBundles(userId, { profile: body });
  if (merged?.unauthorized) return { unauthorized: true };
  if (merged?.usernameCooldown) return { usernameCooldown: true, nextAllowedAt: merged.nextAllowedAt };
  if (merged?.handleTaken) return { handleTaken: true };
  if (merged?.mediaTooLarge) return { mediaTooLarge: true, message: merged.message };
  if (!merged?.wire) return { unauthorized: true };

  return {
    profile: merged.wire.profile,
    usernameCooldownUntil: merged.wire.usernameCooldownUntil ?? null,
  };
}

export async function listTicketsForUser(userId) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.ccsTickets)
    .where(eq(schema.ccsTickets.userId, userId))
    .orderBy(desc(schema.ccsTickets.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    body: r.body,
    status: r.status,
    staffReply: r.staffReply || "",
    createdAt: Number(r.createdAt) || 0,
    updatedAt: Number(r.updatedAt) || 0,
  }));
}

export async function createTicketForUser(userId, payload = {}) {
  const subject = String(payload.subject ?? "").trim().slice(0, 200);
  const bodyText = String(payload.body ?? "").trim().slice(0, 8000);
  if (!subject || !bodyText) return { error: "missing_fields", status: 400 };

  const db = await getDb();
  const id = `tk_${randomUUID()}`;
  const now = Date.now();

  await db.insert(schema.ccsTickets).values({
    id,
    userId,
    subject,
    body: bodyText,
    status: "open",
    staffReply: "",
    createdAt: now,
    updatedAt: now,
  });

  return {
    ticket: {
      id,
      subject,
      body: bodyText,
      status: "open",
      staffReply: "",
      createdAt: now,
      updatedAt: now,
    },
  };
}

export async function presenceTouch(userId) {
  const db = await getDb();
  const now = Date.now();
  await db
    .insert(schema.ccsPresence)
    .values({ userId, lastSeen: now })
    .onConflictDoUpdate({
      target: schema.ccsPresence.userId,
      set: { lastSeen: now },
    });
}

export async function presenceReadmany(ids, viewerId) {
  const db = await getDb();

  await purgeExpiredSessions(db);

  const now = Date.now();
  const out = {};

  /** Touch viewer implicitly so self appears online whenever session resolves */
  if (viewerId) {
    await presenceTouch(viewerId);
    out[viewerId] = true;
  }

  const uniq = [...new Set((ids || []).slice(0, 64).filter(Boolean))];
  if (!uniq.length) return out;

  const rows = await db.select().from(schema.ccsPresence).where(inArray(schema.ccsPresence.userId, uniq));
  const byId = Object.fromEntries(rows.map((r) => [r.userId, Number(r.lastSeen)]));

  for (const id of uniq) {
    const ts = byId[id] || 0;
    out[id] = !!(ts && now - ts < PRESENCE_WINDOW_MS);
  }

  return out;
}

export async function createUserReport(reporterUserId, postId, reasonRaw) {
  const db = await getDb();
  const postIdStr = String(postId || "").trim();
  const reason = String(reasonRaw ?? "Reported").trim().slice(0, 500) || "Reported";
  if (!postIdStr) return { badRequest: true };
  const [postHit] = await db.select({ id: schema.ccsPosts.id }).from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postIdStr)).limit(1);
  if (!postHit) return { missing: true };
  const [dup] = await db
    .select({ id: schema.ccsReports.id })
    .from(schema.ccsReports)
    .where(
      and(
        eq(schema.ccsReports.postId, postIdStr),
        eq(schema.ccsReports.reporterUserId, reporterUserId),
        eq(schema.ccsReports.status, "open")
      )
    )
    .limit(1);
  if (dup) return { duplicate: true };
  const id = `rep_${randomUUID()}`;
  await db.insert(schema.ccsReports).values({
    id,
    postId: postIdStr,
    reporterUserId,
    reason,
    status: "open",
    createdAt: Date.now(),
    resolvedByUserId: "",
    resolvedAt: null,
  });
  return { ok: true, reportId: id };
}

async function mutualRemoveFriendLinks(db, aId, bId) {
  const [ra, rb] = await Promise.all([
    db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, aId)).limit(1),
    db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, bId)).limit(1),
  ]);
  const rowA = ra[0];
  const rowB = rb[0];
  if (!rowA || !rowB) return { missing: true };
  const fa = normalizeFriends(rowA.friendsState);
  const fb = normalizeFriends(rowB.friendsState);
  fa.friends = fa.friends.filter((x) => String(x) !== String(bId));
  fb.friends = fb.friends.filter((x) => String(x) !== String(aId));
  fa.pending = fa.pending.filter((x) => String(x) !== String(bId));
  fb.pending = fb.pending.filter((x) => String(x) !== String(aId));
  fa.outgoing = fa.outgoing.filter((x) => String(x) !== String(bId));
  fb.outgoing = fb.outgoing.filter((x) => String(x) !== String(aId));
  await db.update(schema.ccsUsers).set({ friendsState: fa }).where(eq(schema.ccsUsers.id, aId));
  await db.update(schema.ccsUsers).set({ friendsState: fb }).where(eq(schema.ccsUsers.id, bId));
  return { ok: true };
}

async function mutualAddFriends(db, aId, bId) {
  const [ra, rb] = await Promise.all([
    db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, aId)).limit(1),
    db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, bId)).limit(1),
  ]);
  const rowA = ra[0];
  const rowB = rb[0];
  if (!rowA || !rowB) return { missing: true };
  const fa = normalizeFriends(rowA.friendsState);
  const fb = normalizeFriends(rowB.friendsState);
  const fidA = [...new Set([...fa.friends.map(String).filter(Boolean), String(bId)])];
  const fidB = [...new Set([...fb.friends.map(String).filter(Boolean), String(aId)])];
  fa.friends = fidA;
  fb.friends = fidB;
  fa.pending = fa.pending.filter((x) => String(x) !== String(bId));
  fa.outgoing = fa.outgoing.filter((x) => String(x) !== String(bId));
  fb.pending = fb.pending.filter((x) => String(x) !== String(aId));
  fb.outgoing = fb.outgoing.filter((x) => String(x) !== String(aId));
  await db.update(schema.ccsUsers).set({ friendsState: fa }).where(eq(schema.ccsUsers.id, aId));
  await db.update(schema.ccsUsers).set({ friendsState: fb }).where(eq(schema.ccsUsers.id, bId));
  return { ok: true };
}

/**
 * Unified friend mutations (authenticated). Server updates request rows + mutual friend lists where needed.
 * @returns {Promise<{ error?: string, wire?: ReturnType<accountWireFromRow> & { friends?: unknown } }>}
 */
export async function friendPerformAction(viewerId, body) {
  const db = await getDb();
  const action = String(body?.action || "").trim().toLowerCase();

  async function refreshedWire(uid) {
    const [row] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, uid)).limit(1);
    if (!row) return { error: "missing_user" };
    const w = accountWireFromRow(row);
    w.friends = await friendsWireFromDb(db, row);
    return { wire: w };
  }

  if (!viewerId || !body || typeof body !== "object") return { error: "bad_request" };

  if (action === "request") {
    const toUserId = String(body.toUserId || "").trim();
    if (!toUserId || toUserId === viewerId) return { error: "invalid_target" };
    const [vrow] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, viewerId)).limit(1);
    if (!vrow) return { error: "missing_user" };
    const vf = normalizeFriends(vrow.friendsState);
    if (vf.friends.some((x) => String(x) === toUserId)) return { error: "already_friends" };
    try {
      const id = `fr_${randomUUID()}`;
      await db.insert(schema.ccsFriendRequests).values({ id, fromUserId: viewerId, toUserId, createdAt: Date.now() });
    } catch (e) {
      if (isUniqueViolation(e)) return { error: "pending_or_exists" };
      throw e;
    }
    return refreshedWire(viewerId);
  }

  if (action === "accept") {
    const fromUserId = String(body.fromUserId || "").trim();
    if (!fromUserId || fromUserId === viewerId) return { error: "invalid_target" };
    await db.delete(schema.ccsFriendRequests).where(and(eq(schema.ccsFriendRequests.fromUserId, fromUserId), eq(schema.ccsFriendRequests.toUserId, viewerId)));
    const m = await mutualAddFriends(db, viewerId, fromUserId);
    if (m.missing) return { error: "missing_user" };
    return refreshedWire(viewerId);
  }

  if (action === "decline") {
    const fromUserId = String(body.fromUserId || "").trim();
    if (!fromUserId) return { error: "invalid_target" };
    await db.delete(schema.ccsFriendRequests).where(and(eq(schema.ccsFriendRequests.fromUserId, fromUserId), eq(schema.ccsFriendRequests.toUserId, viewerId)));
    return refreshedWire(viewerId);
  }

  if (action === "cancel") {
    const toUserId = String(body.toUserId || "").trim();
    if (!toUserId) return { error: "invalid_target" };
    await db.delete(schema.ccsFriendRequests).where(and(eq(schema.ccsFriendRequests.fromUserId, viewerId), eq(schema.ccsFriendRequests.toUserId, toUserId)));
    return refreshedWire(viewerId);
  }

  if (action === "remove") {
    const userId = String(body.userId || "").trim();
    if (!userId || userId === viewerId) return { error: "invalid_target" };
    await db.delete(schema.ccsFriendRequests).where(
      or(
        and(eq(schema.ccsFriendRequests.fromUserId, viewerId), eq(schema.ccsFriendRequests.toUserId, userId)),
        and(eq(schema.ccsFriendRequests.fromUserId, userId), eq(schema.ccsFriendRequests.toUserId, viewerId))
      )
    );
    const m = await mutualRemoveFriendLinks(db, viewerId, userId);
    if (m.missing) return { error: "missing_user" };
    return refreshedWire(viewerId);
  }

  return { error: "unknown_action" };
}

const SEARCH_LIMIT_DEFAULT = 30;
const SEARCH_LIMIT_MAX = 80;

async function matchingUserIdsForSearch(db, qRaw) {
  const needle = String(qRaw || "").trim().toLowerCase().replace(/[%_]/g, "").slice(0, 64);
  if (needle.length < 2) return [];
  const rows = await db.select({ id: schema.ccsUsers.id, profile: schema.ccsUsers.profile }).from(schema.ccsUsers).limit(2000);
  const out = [];
  for (const r of rows) {
    const prof = typeof r.profile === "object" && r.profile ? r.profile : {};
    const h = String(prof.handle || "").trim().toLowerCase();
    const nm = String(prof.name || "").trim().toLowerCase();
    if (!h.includes(needle) && !nm.includes(needle)) continue;
    out.push(r.id);
    if (out.length >= 48) break;
  }
  return out;
}

export async function searchForumPostsEnvelope(viewerUserId, opts = {}) {
  const db = await getDb();
  await purgeExpiredSessions(db);

  let limit = Number(opts.limit);
  if (!Number.isFinite(limit) || limit < 1) limit = SEARCH_LIMIT_DEFAULT;
  if (limit > SEARCH_LIMIT_MAX) limit = SEARCH_LIMIT_MAX;

  const qRaw = String(opts.q || "").trim();
  const qq = qRaw.slice(0, 200);
  const tag =
    opts.tag && String(opts.tag).trim() && String(opts.tag).trim() !== "All" ? String(opts.tag).trim() : "";

  let userMatchIds = qq.length >= 2 ? await matchingUserIdsForSearch(db, qq) : [];
  /** Drop viewer from author filter clutter */
  userMatchIds = userMatchIds.filter((id) => id !== viewerUserId).slice(0, 48);

  const escaped = `%${qq.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

  const cursor = decodeFeedCursor(opts.cursor);

  const parts = [];
  if (tag) parts.push(eq(schema.ccsPosts.tag, tag));

  if (qq.length >= 2) {
    const orClauses = [ilike(schema.ccsPosts.content, escaped, "\\")];
    if (userMatchIds.length) orClauses.push(inArray(schema.ccsPosts.userId, userMatchIds));
    parts.push(or(...orClauses));
  }
  /** Empty query → no restriction would return everything; require at least tag or text. */
  if (!tag && qq.length < 2) return { posts: [], users: {}, nextCursor: null };

  if (cursor) {
    parts.push(
      or(
        lt(schema.ccsPosts.createdAt, cursor.createdAt),
        and(eq(schema.ccsPosts.createdAt, cursor.createdAt), lt(schema.ccsPosts.id, cursor.id))
      )
    );
  }

  let q = db.select().from(schema.ccsPosts);
  if (parts.length === 1) q = q.where(parts[0]);
  else if (parts.length > 1) q = q.where(and(...parts));

  const rows = await q.orderBy(desc(schema.ccsPosts.createdAt), desc(schema.ccsPosts.id)).limit(limit + 1);
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && slice.length ? encodeFeedCursor(slice[slice.length - 1]) : null;

  const legacy = slice.map(postRowToLegacy);
  await enrichLegacyPostsOpenReportCounts(db, legacy);

  const idsNeeded = [...new Set(slice.map((r) => r.userId).filter(Boolean))];
  if (viewerUserId) idsNeeded.push(viewerUserId);
  const uniq = [...new Set(idsNeeded)];
  const userRows = uniq.length === 0 ? [] : await db.select().from(schema.ccsUsers).where(inArray(schema.ccsUsers.id, uniq));
  const shimUsers = userRows.map(userRowToShim);
  const shimDb = { users: shimUsers, posts: legacy };
  const built = buildFeed(shimDb, viewerUserId, {});
  return { ...built, nextCursor };
}
