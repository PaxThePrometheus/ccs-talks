import { initialsFromName, relativeTime } from "./format";
import { toPublicProfile } from "./publicUser";

export function authorProfilesByIds(db, userIds) {
  const map = {};
  const byProfile = {};
  const byRole = {};
  for (const u of db.users) {
    if (!u?.id) continue;
    if (u.profile != null) byProfile[u.id] = u.profile;
    byRole[u.id] = typeof u.role === "string" && u.role.trim() ? u.role.trim() : "student";
  }
  for (const id of userIds) {
    if (!id) continue;
    if (!byProfile[id]) continue;
    const base = toPublicProfile(byProfile[id]);
    if (!base) continue;
    map[id] = {
      ...base,
      forumRole: byRole[id] || "student",
    };
  }
  return map;
}

/** Build client-shaped posts (+ related public profiles). */
export function buildFeed(db, viewerUserId = null, { tagFilter = null } = {}) {
  const viewer = viewerUserId ? db.users.find((u) => u.id === viewerUserId) : null;

  let posts = db.posts.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (tagFilter && tagFilter !== "All") {
    posts = posts.filter((p) => p.tag === tagFilter);
  }

  const userIds = [...new Set(posts.map((p) => p.userId))];
  const authors = authorProfilesByIds(db, userIds);

  const clientPosts = posts.map((p) => ({
    id: p.id,
    userId: p.userId,
    avatar: initialsFromName(authors[p.userId]?.name ?? "Student"),
    time: relativeTime(p.createdAt),
    content: p.content,
    imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : "",
    likes: Array.isArray(p.likedBy) ? p.likedBy.length : 0,
    comments: typeof p.commentCount === "number" ? p.commentCount : 0,
    bookmarked: viewer ? viewer.bookmarkedPostIds.includes(p.id) : false,
    tag: p.tag || "General",
    pinned: !!p.pinned,
    createdAt: p.createdAt,
    likedByMe: !!(viewer && Array.isArray(p.likedBy) && p.likedBy.includes(viewer.id)),
  }));

  return { posts: clientPosts, users: authors };
}
