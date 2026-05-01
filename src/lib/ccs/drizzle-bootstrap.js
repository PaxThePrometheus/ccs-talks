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
  ];
}
