/** Additive migration; never resets credentials, grants roles or enables MFA. */
export const staffMigration = [
  `CREATE TABLE IF NOT EXISTS ccs_staff_mfa (
    user_id text PRIMARY KEY REFERENCES ccs_users(id) ON DELETE CASCADE,
    encrypted_secret text NOT NULL, enabled boolean NOT NULL DEFAULT false,
    recovery_hashes jsonb NOT NULL DEFAULT '{}'::jsonb, last_counter bigint NOT NULL DEFAULT -1
  )`,
  `ALTER TABLE ccs_sessions ADD COLUMN IF NOT EXISTS created_at bigint NOT NULL DEFAULT 0`,
  `ALTER TABLE ccs_sessions ADD COLUMN IF NOT EXISTS last_seen_at bigint NOT NULL DEFAULT 0`,
  `ALTER TABLE ccs_sessions ADD COLUMN IF NOT EXISTS authenticated_at bigint NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS ccs_auth_attempts (
    key text PRIMARY KEY, attempts integer NOT NULL, resets_at bigint NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS ccs_auth_attempts_expiry_idx ON ccs_auth_attempts (resets_at)`,
  `CREATE OR REPLACE FUNCTION ccs_protect_staff_access() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    PERFORM pg_advisory_xact_lock(73194201);
    IF OLD.role = 'admin' AND NOT OLD.banned AND
      (TG_OP = 'DELETE' OR NEW.role <> 'admin' OR NEW.banned) AND
      NOT EXISTS (SELECT 1 FROM ccs_users WHERE role = 'admin' AND NOT banned AND id <> OLD.id)
    THEN
      RAISE EXCEPTION 'Cannot remove the last active administrator' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END $$`,
  `CREATE OR REPLACE TRIGGER ccs_protect_staff_access BEFORE UPDATE OF role, banned OR DELETE
    ON ccs_users FOR EACH ROW EXECUTE FUNCTION ccs_protect_staff_access()`,
  `CREATE OR REPLACE FUNCTION ccs_revoke_changed_access() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF NEW.banned OR OLD.role IS DISTINCT FROM NEW.role THEN
      DELETE FROM ccs_sessions WHERE user_id = NEW.id;
    END IF;
    RETURN NEW;
  END $$`,
  `CREATE OR REPLACE TRIGGER ccs_revoke_changed_access AFTER UPDATE OF role, banned
    ON ccs_users FOR EACH ROW EXECUTE FUNCTION ccs_revoke_changed_access()`,
];
