import { bigint, boolean, integer, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const ccsUsers = pgTable("ccs_users", {
  version: bigint("version", { mode: "number" }).notNull().default(0),
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
  version: bigint("version", { mode: "number" }).notNull().default(0),
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  updatedBy: text("updated_by").notNull().default(""),
});

export const ccsSessions = pgTable("ccs_sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull().references(() => ccsUsers.id, { onDelete: "cascade" }),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(0),
  lastSeenAt: bigint("last_seen_at", { mode: "number" }).notNull().default(0),
  authenticatedAt: bigint("authenticated_at", { mode: "number" }).notNull().default(0),
});

export const ccsAuthAttempts = pgTable("ccs_auth_attempts", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  resetsAt: bigint("resets_at", { mode: "number" }).notNull(),
});

export const ccsStaffMfa = pgTable("ccs_staff_mfa", {
  userId: text("user_id").primaryKey().references(() => ccsUsers.id, { onDelete: "cascade" }),
  encryptedSecret: text("encrypted_secret").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  recoveryHashes: jsonb("recovery_hashes").notNull().default({}),
  lastCounter: bigint("last_counter", { mode: "number" }).notNull().default(-1),
});

export const ccsPosts = pgTable("ccs_posts", {
  version: bigint("version", { mode: "number" }).notNull().default(0),
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => ccsUsers.id, { onDelete: "cascade" }),
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
  postId: text("post_id").notNull().references(() => ccsPosts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => ccsUsers.id, { onDelete: "cascade" }),
  /** Top-level comment id when this row is a direct reply (single-level threads). */
  parentId: text("parent_id").references(() => ccsComments.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const ccsPresence = pgTable("ccs_presence", {
  userId: text("user_id").primaryKey(),
  lastSeen: bigint("last_seen", { mode: "number" }).notNull(),
});

export const ccsAnnouncements = pgTable("ccs_announcements", {
  version: bigint("version", { mode: "number" }).notNull().default(0),
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  pinned: boolean("pinned").notNull().default(false),
  authorId: text("author_id").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const ccsTickets = pgTable("ccs_tickets", {
  version: bigint("version", { mode: "number" }).notNull().default(0),
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => ccsUsers.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("open"),
  staffReply: text("staff_reply").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const ccsPasswordResetTokens = pgTable("ccs_password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => ccsUsers.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});

/** Moderation: user-flagged threads (staff review). */
export const ccsReports = pgTable("ccs_reports", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  reporterUserId: text("reporter_user_id").notNull(),
  reason: text("reason").notNull().default(""),
  /** 'open' | 'resolved' | 'dismissed' */
  status: text("status").notNull().default("open"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  resolvedByUserId: text("resolved_by_user_id").notNull().default(""),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  snapshot: jsonb("snapshot").notNull().default({}),
  resolutionNote: text("resolution_note").notNull().default(""),
});

/** Pending friend invitations (accepted rows are deleted after both users are updated). */
export const ccsFriendRequests = pgTable(
  "ccs_friend_requests",
  {
    id: text("id").primaryKey(),
    fromUserId: text("from_user_id").notNull().references(() => ccsUsers.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id").notNull().references(() => ccsUsers.id, { onDelete: "cascade" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("ccs_friend_requests_from_to_uidx").on(t.fromUserId, t.toUserId)]
);

/** Publication/moderation evidence intentionally survives source-record deletion. */
export const ccsContentRevisions = pgTable("ccs_content_revisions", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  targetId: text("target_id").notNull(),
  actorId: text("actor_id").notNull(),
  value: jsonb("value").notNull(),
  reason: text("reason").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const ccsTicketMessages = pgTable("ccs_ticket_messages", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => ccsTickets.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  body: text("body").notNull(),
  requestId: text("request_id").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, table => [uniqueIndex("ccs_ticket_messages_ticket_id_request_id_key").on(table.ticketId, table.requestId)]);

export const ccsMigrations = pgTable("ccs_migrations", {
  version: text("version").primaryKey(),
  appliedAt: bigint("applied_at", { mode: "number" }).notNull(),
});
