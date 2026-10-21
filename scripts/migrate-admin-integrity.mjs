import { neon } from "@neondatabase/serverless";
import { ddlFragments } from "../src/lib/ccs/drizzle-bootstrap.js";
import { integrityInspection } from "../src/lib/ccs/integrityMigration.mjs";

const mode = process.argv[2];
if (!["--inspect", "--apply"].includes(mode) || !process.env.DATABASE_URL) {
  console.error("Requires DATABASE_URL. Use --inspect or --apply.");
  process.exit(1);
}
try {
  const db = neon(process.env.DATABASE_URL, {
    fetchOptions: { signal: AbortSignal.timeout(30000) },
  });
  const [existing] = await db.query(
    "SELECT to_regclass('public.ccs_users') AS users",
  );
  const before = existing.users
    ? await db.query(integrityInspection)
    : [{ uninitialized: true }];
  console.log(JSON.stringify({ inspection: before[0], mode }));
  const identitySql =
    "SELECT COUNT(*)::int AS accounts, COUNT(*) FILTER(WHERE role='admin' AND NOT banned)::int AS active_admins, md5(string_agg(id||password_salt||password_hash||role||banned::text,'' ORDER BY id)) AS identity_fingerprint FROM ccs_users";
  const [identity] = existing.users
    ? await db.query(identitySql)
    : [{ identity_fingerprint: null }];
  if (mode === "--apply") {
    await db.transaction([
      db.query("SELECT pg_advisory_xact_lock(73194200)"),
      ...ddlFragments().map((statement) => db.query(statement)),
    ]);
    const [after] = await db.query(identitySql);
    const migrations = await db.query(
      "SELECT version FROM ccs_migrations ORDER BY version",
    );
    const [schema] = await db.query(
      "SELECT COUNT(*)::int AS version_columns FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('ccs_users','ccs_posts','ccs_site_settings','ccs_announcements','ccs_tickets') AND column_name='version'",
    );
    console.log(
      JSON.stringify({
        applied: migrations.map((row) => row.version),
        versionColumnsVerified: schema.version_columns === 5,
        accounts: after.accounts,
        activeAdmins: after.active_admins,
        credentialsAndRolesPreserved:
          identity.identity_fingerprint === after.identity_fingerprint,
        legacyOrphansDeleted: false,
      }),
    );
    if (
      schema.version_columns !== 5 ||
      identity.identity_fingerprint !== after.identity_fingerprint
    )
      process.exitCode = 1;
  }
} catch (error) {
  console.error(
    JSON.stringify({
      migrationFailed: true,
      errorType: error.name,
      code: error.code || null,
    }),
  );
  process.exitCode = 1;
}
