import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

// Owner-only operation: never import into an application route. Uses direct DB
// credentials and an explicit confirmation; never creates an account or session.
const [rawEmail, confirmation, ...extra] = process.argv.slice(2);
const email = String(rawEmail || "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || confirmation !== "--confirm" || extra.length) {
  console.error("Usage: npm run admin:provision -- owner@example.com --confirm");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Use the intended deployment's database credentials.");
  process.exit(1);
}

try {
  const sql = neon(process.env.DATABASE_URL);
  const [, rows] = await sql.transaction([
    // Serialize first-admin provisioning and concurrent user/role mutations.
    // ReadCommitted gives the next statement a fresh snapshot after this lock.
    sql`LOCK TABLE ccs_users IN SHARE ROW EXCLUSIVE MODE`,
    sql`
      WITH promoted AS (
        UPDATE ccs_users SET role = 'admin'
        WHERE email = ${email} AND banned = false
          AND NOT EXISTS (SELECT 1 FROM ccs_users WHERE role = 'admin')
        RETURNING id
      ), logged AS (
        INSERT INTO ccs_audit_log (id, actor_id, action, target_id, meta, created_at)
        SELECT ${`a_${randomUUID()}`}, 'deployment_owner', 'admin_owner_provision', id,
          '{"method":"owner_cli"}'::jsonb, ${Date.now()} FROM promoted
        RETURNING target_id
      )
      SELECT target_id AS id FROM logged
    `,
  ], { isolationLevel: "ReadCommitted" });

  if (rows.length !== 1) {
    console.error("No changes: an admin already exists, or the requested account is missing or banned.");
    process.exitCode = 1;
  } else {
    console.log("First administrator provisioned and audited. Sign in with the account's existing password at /admin/login.");
  }
} catch {
  // Database errors can contain connection details; do not echo credentials.
  console.error("Provisioning failed. The transaction was rolled back. Check database access and schema initialization.");
  process.exitCode = 1;
}
