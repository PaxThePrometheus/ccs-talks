/** Append-only support conversations; preserves the legacy reply as its first message. */
export const workflowMigration = [
  `DO $migration$ BEGIN
    IF EXISTS(SELECT 1 FROM ccs_migrations WHERE version='20261021_workflows_v1') THEN RETURN; END IF;
    CREATE TABLE IF NOT EXISTS ccs_ticket_messages (
      id text PRIMARY KEY, ticket_id text NOT NULL REFERENCES ccs_tickets(id) ON DELETE CASCADE,
      author_id text NOT NULL, body text NOT NULL, created_at bigint NOT NULL,
      request_id text NOT NULL, UNIQUE(ticket_id,request_id)
    );
    CREATE INDEX IF NOT EXISTS ccs_ticket_messages_ticket_idx ON ccs_ticket_messages(ticket_id,created_at);
    INSERT INTO ccs_ticket_messages(id,ticket_id,author_id,body,created_at,request_id)
      SELECT 'legacy_'||id,id,'legacy_staff',staff_reply,updated_at,'legacy' FROM ccs_tickets WHERE staff_reply<>'' ON CONFLICT DO NOTHING;
    INSERT INTO ccs_migrations VALUES('20261021_workflows_v1',(extract(epoch FROM clock_timestamp())*1000)::bigint);
  END $migration$`,
];
