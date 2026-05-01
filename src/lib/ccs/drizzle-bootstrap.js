/**
 * Minimal idempotent DDL for Vercel (no separate migrate step required).
 * Safe to run on every cold start — uses IF NOT EXISTS.
 */
export function ddlFragments() {
  return [
    `CREATE TABLE IF NOT EXISTS ccs_users (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_salt text NOT NULL,
      password_hash text NOT NULL,
      profile jsonb NOT NULL,
      bookmarked_post_ids jsonb NOT NULL DEFAULT '[]'::jsonb
    )`,
    `CREATE TABLE IF NOT EXISTS ccs_sessions (
      token text PRIMARY KEY,
      user_id text NOT NULL REFERENCES ccs_users(id) ON DELETE CASCADE,
      expires_at bigint NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS ccs_posts (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      content text NOT NULL,
      tag text NOT NULL DEFAULT 'General',
      created_at bigint NOT NULL,
      liked_by jsonb NOT NULL DEFAULT '[]'::jsonb,
      comment_count bigint NOT NULL DEFAULT 0,
      pinned boolean NOT NULL DEFAULT false
    )`,
    `CREATE TABLE IF NOT EXISTS ccs_comments (
      id text PRIMARY KEY,
      post_id text NOT NULL,
      user_id text NOT NULL,
      body text NOT NULL,
      created_at bigint NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS ccs_presence (
      user_id text PRIMARY KEY,
      last_seen bigint NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS ccs_posts_created_idx ON ccs_posts (created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS ccs_comments_post_idx ON ccs_comments (post_id)`,
    `CREATE INDEX IF NOT EXISTS ccs_sessions_expires_idx ON ccs_sessions (expires_at)`,
    `ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS prefs jsonb NOT NULL DEFAULT '{}'::jsonb`,
    `ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS friends_state jsonb NOT NULL DEFAULT '{"friends":[],"pending":[],"outgoing":[]}'::jsonb`,
    `ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS subs_state jsonb NOT NULL DEFAULT '{"tags":[],"follows":[]}'::jsonb`,
    `ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS activities jsonb NOT NULL DEFAULT '[]'::jsonb`,
    `ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student'`,
    `ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false`,
    `ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS banned_reason text NOT NULL DEFAULT ''`,
    `ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS banned_at bigint`,
    `ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS created_at bigint`,
    `CREATE INDEX IF NOT EXISTS ccs_users_role_idx ON ccs_users (role)`,
    `CREATE INDEX IF NOT EXISTS ccs_users_profile_handle_expr_idx ON ccs_users ((LOWER(profile->>'handle')))`,
    `ALTER TABLE ccs_posts ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT ''`,
    `ALTER TABLE ccs_comments ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT ''`,
    `CREATE TABLE IF NOT EXISTS ccs_audit_log (
      id text PRIMARY KEY,
      actor_id text NOT NULL,
      action text NOT NULL,
      target_id text NOT NULL DEFAULT '',
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at bigint NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS ccs_audit_log_created_idx ON ccs_audit_log (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS ccs_site_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at bigint NOT NULL,
      updated_by text NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS ccs_announcements (
      id text PRIMARY KEY,
      title text NOT NULL,
      body text NOT NULL DEFAULT '',
      pinned boolean NOT NULL DEFAULT false,
      author_id text NOT NULL DEFAULT '',
      created_at bigint NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS ccs_announcements_created_idx ON ccs_announcements (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS ccs_tickets (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES ccs_users(id) ON DELETE CASCADE,
      subject text NOT NULL,
      body text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      staff_reply text NOT NULL DEFAULT '',
      created_at bigint NOT NULL,
      updated_at bigint NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS ccs_tickets_user_idx ON ccs_tickets (user_id)`,
    `CREATE INDEX IF NOT EXISTS ccs_tickets_status_idx ON ccs_tickets (status)`,
    `CREATE TABLE IF NOT EXISTS ccs_password_reset_tokens (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES ccs_users(id) ON DELETE CASCADE,
      token text NOT NULL UNIQUE,
      expires_at bigint NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS ccs_password_reset_tokens_token_idx ON ccs_password_reset_tokens (token)`,
  ];
}
