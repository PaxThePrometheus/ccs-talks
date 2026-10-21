/** Repair deployments that recorded the early integrity migration before versioning was added. */
export const integrityRepairMigration = [
  `DO $migration$ BEGIN
    IF EXISTS(SELECT 1 FROM ccs_migrations WHERE version='20261021_integrity_v2') THEN RETURN; END IF;
    ALTER TABLE ccs_users ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    ALTER TABLE ccs_posts ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    ALTER TABLE ccs_site_settings ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    ALTER TABLE ccs_announcements ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    ALTER TABLE ccs_tickets ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
    CREATE OR REPLACE FUNCTION ccs_increment_version() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN NEW.version=OLD.version+1; RETURN NEW; END $fn$;
    CREATE OR REPLACE TRIGGER ccs_users_version BEFORE UPDATE ON ccs_users FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
    CREATE OR REPLACE TRIGGER ccs_posts_version BEFORE UPDATE ON ccs_posts FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
    CREATE OR REPLACE TRIGGER ccs_settings_version BEFORE UPDATE ON ccs_site_settings FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
    CREATE OR REPLACE TRIGGER ccs_announcements_version BEFORE UPDATE ON ccs_announcements FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
    CREATE OR REPLACE TRIGGER ccs_tickets_version BEFORE UPDATE ON ccs_tickets FOR EACH ROW EXECUTE FUNCTION ccs_increment_version();
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
    CREATE OR REPLACE TRIGGER ccs_capture_removed_post BEFORE DELETE ON ccs_posts FOR EACH ROW EXECUTE FUNCTION ccs_capture_removed_post();
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
    CREATE OR REPLACE TRIGGER ccs_clean_removed_member BEFORE DELETE ON ccs_users FOR EACH ROW EXECUTE FUNCTION ccs_clean_removed_member();
    INSERT INTO ccs_migrations VALUES('20261021_integrity_v2',(extract(epoch FROM clock_timestamp())*1000)::bigint);
  END $migration$`,
];
