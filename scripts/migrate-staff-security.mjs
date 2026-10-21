import { neon } from "@neondatabase/serverless";
import { staffMigration } from "../src/lib/ccs/staffMigration.mjs";

if (process.argv.slice(2).join(" ") !== "--apply" || !process.env.DATABASE_URL) {
  console.error("Requires DATABASE_URL and explicit --apply. Usage: npm run db:staff -- --apply");
  process.exit(1);
}
try {
  const sql = neon(process.env.DATABASE_URL);
  await sql.transaction(staffMigration.map((statement) => sql.query(statement)));
  const [row] = await sql`SELECT count(*)::integer AS active_admins FROM ccs_users WHERE role = 'admin' AND NOT banned`;
  console.log(`Staff security migration applied. Active administrators: ${row.active_admins}. No passwords or roles changed.`);
} catch {
  console.error("Migration failed. Check access/schema with the database owner. No connection details are printed.");
  process.exitCode = 1;
}
