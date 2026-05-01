import crypto, { randomUUID } from "node:crypto";
import { DEFAULT_PROFILE } from "@/components/ccs-talks/config/appConfig";
import { asc, desc, eq, inArray, lte, ne } from "drizzle-orm";
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
import { toPublicProfile } from "./publicUser";
import * as schema from "./schema";

const PRESENCE_WINDOW_MS = 120_000;

function coerceArr(x) {
  return Array.isArray(x) ? x : [];
}

function userRowToShim(row) {
  return {
    id: row.id,
    profile: row.profile,
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

async function hydrateClientPosts(db, viewerUserId, legacyPosts) {
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

export async function fetchPublicFeed(viewerUserId, tagFilter) {
  const db = await getDb();
  await purgeExpiredSessions(db);

  let q = db.select().from(schema.ccsPosts);
  if (tagFilter && tagFilter !== "All") {
    q = q.where(eq(schema.ccsPosts.tag, tagFilter));
  }
  const rows = await q.orderBy(desc(schema.ccsPosts.createdAt));

  const legacy = rows.map(postRowToLegacy);

  /** Viewer bookmarks / likedBy flags need viewer row merged into shim. */
  const idsNeeded = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  if (viewerUserId) idsNeeded.push(viewerUserId);
  const uniq = [...new Set(idsNeeded)];

  const userRows =
    uniq.length === 0
      ? []
      : await db.select().from(schema.ccsUsers).where(inArray(schema.ccsUsers.id, uniq));
  const shimUsers = userRows.map(userRowToShim);

  const shimDb = { users: shimUsers, posts: legacy };
  return buildFeed(shimDb, viewerUserId, { tagFilter });
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

export async function registerAccountRow(email, password, name, suggestedHandle) {
  const db = await getDb();
  if (await findUserByEmail(email)) return { conflict: true };

  const id = makeUserId();
  const { salt, hash } = newPasswordRecord(password);
  const handle = await uniqueHandle(db, suggestedHandle);
  const profile = { ...DEFAULT_PROFILE, id, name, handle };

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

export async function createUserPost(viewerUserId, content, tag) {
  const db = await getDb();
  const id = `p_${randomUUID()}`;
  const now = Date.now();
  await db.insert(schema.ccsPosts).values({
    id,
    userId: viewerUserId,
    content,
    tag: tag || "General",
    createdAt: now,
    likedBy: [],
    commentCount: 0,
    pinned: false,
  });

  /** Return hydrated single card */
  return clientPostPreview(viewerUserId, id);
}

export async function updatePostBody(postId, ownerUserId, content) {
  const db = await getDb();
  const [existing] = await db.select().from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!existing) return { missing: true };
  if (existing.userId !== ownerUserId) return { forbidden: true };

  await db.update(schema.ccsPosts).set({ content }).where(eq(schema.ccsPosts.id, postId));

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
    mapped: rows.map((c) => ({ id: c.id, userId: c.userId, text: c.body, ts: c.createdAt })),
    users,
  };
}

export async function addCommentEnvelope(postId, viewerUserId, text) {
  const db = await getDb();

  const [postRow] = await db.select().from(schema.ccsPosts).where(eq(schema.ccsPosts.id, postId)).limit(1);
  if (!postRow) return { missing: true };

  const id = `c_${randomUUID()}`;
  const createdAt = Date.now();

  await db.insert(schema.ccsComments).values({
    id,
    postId,
    userId: viewerUserId,
    body: text,
    createdAt,
  });

  const nextCount = Number(postRow.commentCount ?? 0) + 1;
  await db.update(schema.ccsPosts).set({ commentCount: nextCount }).where(eq(schema.ccsPosts.id, postId));

  const postCard = await clientPostPreview(viewerUserId, postId);

  /** Viewer row snippet for avatar names */
  const [viewerRow] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, viewerUserId)).limit(1);
  const users = viewerRow?.profile ? { [viewerUserId]: toPublicProfile(viewerRow.profile) } : {};

  return {
    comment: { id, userId: viewerUserId, text, ts: createdAt },
    post: postCard,
    users,
  };
}

const PROFILE_KEYS = new Set([
  "name",
  "handle",
  "status",
  "university",
  "college",
  "program",
  "year",
  "campus",
  "focus",
  "org",
  "bio",
  "badges",
  "avatarColor",
  "avatarAccent",
  "bannerColor",
  "bannerAccent",
  "avatarImage",
  "bannerImage",
]);

const MAX_DATA_URL_LEN = 360_000;
const MAX_REMOTE_IMAGE_URL_LEN = 4096;

function clampMediaField(key, raw) {
  if (raw == null || raw === "") return "";
  const v = typeof raw === "string" ? raw : String(raw);
  if (/^data:image\//i.test(v)) {
    if (v.length > MAX_DATA_URL_LEN) {
      const label = key === "avatarImage" ? "Avatar" : "Banner";
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
  return {
    email: row.email || "",
    profile: toPublicProfile(merged),
    prefs: normalizePrefs(row.prefs),
    friends: normalizeFriends(row.friendsState),
    subs: normalizeSubs(row.subsState),
    activities: normalizeActivities(row.activities),
    role: row.role || "student",
    banned: !!row.banned,
  };
}

export async function getAccountWire(token) {
  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return null;

  const db = await getDb();
  const [row] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.id, viewer.id)).limit(1);
  if (!row) return null;
  return accountWireFromRow(row);
}

async function isHandleTakenElsewhere(db, handle, excludeUserId) {
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

  let nextProfile = { ...DEFAULT_PROFILE, ...(typeof row.profile === "object" ? row.profile : {}), id: userId };

  const patchProfile = body && typeof body.profile === "object" ? body.profile : null;
  if (patchProfile) {
    try {
      for (const [k, v] of Object.entries(patchProfile)) {
        if (!PROFILE_KEYS.has(k)) continue;
        if (k === "handle") {
          nextProfile.handle =
            String(v || "")
              .replace(/[^\w.]/g, "_")
              .slice(0, 32) || nextProfile.handle;
        } else if (k === "name") nextProfile.name = String(v || "").slice(0, 80);
        else if (k === "bio") nextProfile.bio = String(v || "").slice(0, 280);
        else if (k === "badges") {
          nextProfile.badges = Array.isArray(v) ? v.slice(0, 20).map((x) => String(x || "").slice(0, 40)) : nextProfile.badges;
        } else if (k === "avatarImage" || k === "bannerImage") nextProfile[k] = clampMediaField(k, v);
        else nextProfile[k] = v;
      }
    } catch (e) {
      return { mediaTooLarge: true, message: e.message };
    }

    if (await isHandleTakenElsewhere(db, nextProfile.handle, userId)) return { handleTaken: true };
  }

  const currPrefs = normalizePrefs(row.prefs);
  const currFriends = normalizeFriends(row.friendsState);
  const currSubs = normalizeSubs(row.subsState);
  const currActivities = normalizeActivities(row.activities);

  let nextPrefs = currPrefs;
  let nextFriends = currFriends;
  let nextSubs = currSubs;
  let nextActs = currActivities;

  if (body.prefs !== undefined && typeof body.prefs === "object") nextPrefs = normalizePrefs({ ...currPrefs, ...body.prefs });
  if (body.friends !== undefined && typeof body.friends === "object") {
    nextFriends = normalizeFriends({ ...currFriends, ...body.friends });
  }
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
  if (merged?.handleTaken) return { handleTaken: true };
  if (merged?.mediaTooLarge) return { mediaTooLarge: true, message: merged.message };
  if (!merged?.wire) return { unauthorized: true };

  return { profile: merged.wire.profile };
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
