/** Additive integrity migration. Legacy orphans are reported, never silently deleted. */
export const integrityMigration = [
  `CREATE TABLE IF NOT EXISTS ccs_migrations (version text PRIMARY KEY, applied_at bigint NOT NULL)`,
  `DO $migration$ BEGIN
    IF EXISTS (SELECT 1 FROM ccs_migrations WHERE version = '20261021_integrity_v1') THEN RETURN; END IF;
    ALTER TABLE ccs_reports ADD COLUMN IF NOT EXISTS snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE ccs_reports ADD COLUMN IF NOT EXISTS resolution_note text NOT NULL DEFAULT '';
    CREATE TABLE IF NOT EXISTS ccs_content_revisions (
      id text PRIMARY KEY, kind text NOT NULL, target_id text NOT NULL, actor_id text NOT NULL,
      value jsonb NOT NULL, reason text NOT NULL DEFAULT '', created_at bigint NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ccs_content_revisions_target_idx ON ccs_content_revisions(kind,target_id,created_at DESC);
    ALTER TABLE ccs_posts ADD CONSTRAINT ccs_posts_user_fk FOREIGN KEY(user_id) REFERENCES ccs_users(id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE ccs_comments ADD CONSTRAINT ccs_comments_post_fk FOREIGN KEY(post_id) REFERENCES ccs_posts(id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE ccs_comments ADD CONSTRAINT ccs_comments_user_fk FOREIGN KEY(user_id) REFERENCES ccs_users(id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE ccs_comments ADD CONSTRAINT ccs_comments_parent_fk FOREIGN KEY(parent_id) REFERENCES ccs_comments(id) ON DELETE SET NULL NOT VALID;
    ALTER TABLE ccs_presence ADD CONSTRAINT ccs_presence_user_fk FOREIGN KEY(user_id) REFERENCES ccs_users(id) ON DELETE CASCADE NOT VALID;
    ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    ALTER TABLE ccs_posts ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    ALTER TABLE ccs_site_settings ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    ALTER TABLE ccs_announcements ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    ALTER TABLE ccs_tickets ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    CREATE OR REPLACE FUNCTION ccs_increment_version() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN NEW.version=OLD.version+1; RETURN NEW; END $fn$;
    CREATE TRIGGER ccs_users_version BEFORE UPDATE ON ccs_users FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
    CREATE TRIGGER ccs_posts_version BEFORE UPDATE ON ccs_posts FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
    CREATE TRIGGER ccs_settings_version BEFORE UPDATE ON ccs_site_settings FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
    CREATE TRIGGER ccs_announcements_version BEFORE UPDATE ON ccs_announcements FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
    CREATE TRIGGER ccs_tickets_version BEFORE UPDATE ON ccs_tickets FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
    CREATE OR REPLACE FUNCTION ccs_capture_removed_post() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      UPDATE ccs_reports SET snapshot = CASE WHEN snapshot='{}'::jsonb THEN jsonb_build_object('post', to_jsonb(OLD), 'author',
        (SELECT jsonb_build_object('id',id,'name',profile->>'name','handle',profile->>'handle') FROM ccs_users WHERE id=OLD.user_id)) ELSE snapshot END,
        resolved_by_user_id=CASE WHEN status='open' THEN COALESCE(NULLIF(current_setting('ccs.actor_id',true),''),'system') ELSE resolved_by_user_id END,
        status = CASE WHEN status='open' THEN 'resolved' ELSE status END,
        resolution_note = CASE WHEN status='open' THEN 'Source post removed; evidence retained.' ELSE resolution_note END,
        resolved_at = CASE WHEN status='open' THEN (extract(epoch FROM clock_timestamp())*1000)::bigint ELSE resolved_at END
        WHERE post_id=OLD.id;
      UPDATE ccs_users SET bookmarked_post_ids = bookmarked_post_ids - OLD.id WHERE bookmarked_post_ids ? OLD.id;
      RETURN OLD;
    END $fn$;
    CREATE TRIGGER ccs_capture_removed_post BEFORE DELETE ON ccs_posts FOR EACH ROW EXECUTE FUNCTION ccs_capture_removed_post();
    CREATE OR REPLACE FUNCTION ccs_comment_count() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      IF TG_OP='INSERT' THEN
        UPDATE ccs_posts SET comment_count=comment_count+1 WHERE id=NEW.post_id;
        RETURN NEW;
      END IF;
      UPDATE ccs_posts SET comment_count=GREATEST(0,comment_count-1) WHERE id=OLD.post_id;
      RETURN OLD;
    END $fn$;
    CREATE TRIGGER ccs_comment_count_insert AFTER INSERT ON ccs_comments FOR EACH ROW EXECUTE FUNCTION ccs_comment_count();
    CREATE TRIGGER ccs_comment_count_delete AFTER DELETE ON ccs_comments FOR EACH ROW EXECUTE FUNCTION ccs_comment_count();
    UPDATE ccs_posts p SET comment_count=(SELECT COUNT(*) FROM ccs_comments c WHERE c.post_id=p.id);
    CREATE OR REPLACE FUNCTION ccs_clean_removed_member() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      UPDATE ccs_reports r SET snapshot=jsonb_build_object('post',to_jsonb(p),'author',jsonb_build_object('id',OLD.id,'name',OLD.profile->>'name','handle',OLD.profile->>'handle'))
        FROM ccs_posts p WHERE r.post_id=p.id AND p.user_id=OLD.id AND r.snapshot='{}'::jsonb;
      UPDATE ccs_posts SET liked_by=liked_by-OLD.id WHERE liked_by ? OLD.id;
      UPDATE ccs_users SET friends_state=jsonb_set(jsonb_set(jsonb_set(friends_state,
        '{friends}',COALESCE(friends_state->'friends','[]'::jsonb)-OLD.id),
        '{pending}',COALESCE(friends_state->'pending','[]'::jsonb)-OLD.id),
        '{outgoing}',COALESCE(friends_state->'outgoing','[]'::jsonb)-OLD.id),
        subs_state=jsonb_set(subs_state,'{follows}',COALESCE(subs_state->'follows','[]'::jsonb)-OLD.id)
        WHERE id<>OLD.id AND (friends_state->'friends' ? OLD.id OR friends_state->'pending' ? OLD.id OR friends_state->'outgoing' ? OLD.id OR subs_state->'follows' ? OLD.id);
      RETURN OLD;
    END $fn$;
    CREATE TRIGGER ccs_clean_removed_member BEFORE DELETE ON ccs_users FOR EACH ROW EXECUTE FUNCTION ccs_clean_removed_member();
    INSERT INTO ccs_migrations VALUES('20261021_integrity_v1',(extract(epoch FROM clock_timestamp())*1000)::bigint);
  END $migration$`,
];

export const integrityInspection = `SELECT
  (SELECT COUNT(*) FROM ccs_posts p WHERE NOT EXISTS(SELECT 1 FROM ccs_users u WHERE u.id=p.user_id)) AS orphan_posts,
  (SELECT COUNT(*) FROM ccs_comments c WHERE NOT EXISTS(SELECT 1 FROM ccs_posts p WHERE p.id=c.post_id)) AS orphan_post_comments,
  (SELECT COUNT(*) FROM ccs_comments c WHERE NOT EXISTS(SELECT 1 FROM ccs_users u WHERE u.id=c.user_id)) AS orphan_author_comments,
  (SELECT COUNT(*) FROM ccs_comments c WHERE c.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ccs_comments p WHERE p.id=c.parent_id)) AS orphan_replies`;
