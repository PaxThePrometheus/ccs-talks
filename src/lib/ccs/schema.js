import { bigint, boolean, jsonb, pgTable, text } from "drizzle-orm/pg-core";

export const ccsUsers = pgTable("ccs_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordSalt: text("password_salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  profile: jsonb("profile").notNull(),
  bookmarkedPostIds: jsonb("bookmarked_post_ids").notNull(),
  prefs: jsonb("prefs").notNull(),
  friendsState: jsonb("friends_state").notNull(),
  subsState: jsonb("subs_state").notNull(),
  activities: jsonb("activities").notNull(),
  /** RBAC: 'student' | 'moderator' | 'admin' */
  role: text("role").notNull().default("student"),
  banned: boolean("banned").notNull().default(false),
  bannedReason: text("banned_reason").notNull().default(""),
  bannedAt: bigint("banned_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }),
});

export const ccsAuditLog = pgTable("ccs_audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id").notNull().default(""),
  meta: jsonb("meta").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const ccsSiteSettings = pgTable("ccs_site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  updatedBy: text("updated_by").notNull().default(""),
});

export const ccsSessions = pgTable("ccs_sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});

export const ccsPosts = pgTable("ccs_posts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  tag: text("tag").notNull().default("General"),
  /** Data URL or https image attached to the post (optional). */
  imageUrl: text("image_url").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  likedBy: jsonb("liked_by").notNull(),
  commentCount: bigint("comment_count", { mode: "number" }).notNull().default(0),
  pinned: boolean("pinned").notNull().default(false),
});

export const ccsComments = pgTable("ccs_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const ccsPresence = pgTable("ccs_presence", {
  userId: text("user_id").primaryKey(),
  lastSeen: bigint("last_seen", { mode: "number" }).notNull(),
});

export const ccsAnnouncements = pgTable("ccs_announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  pinned: boolean("pinned").notNull().default(false),
  authorId: text("author_id").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const ccsTickets = pgTable("ccs_tickets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("open"),
  staffReply: text("staff_reply").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const ccsPasswordResetTokens = pgTable("ccs_password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});
