import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { ddlFragments } from "./drizzle-bootstrap";
import * as schema from "./schema";

let _neon = null;
let _db = null;
let _initPromise = null;

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[ccs-talks] DATABASE_URL is missing. Use Neon (free tier): create a project, copy the Postgres connection string, add it as DATABASE_URL on Vercel and in local .env.local.",
    );
  }
  return url;
}

async function initialize() {
  const url = requireDatabaseUrl();
  _neon ||= neon(url);
  // Production verifies the deployment migration; runtime requests do not run DDL.
  // Local bootstrap is retained for new development databases.
  const verifyOnly = process.env.CCS_SCHEMA_MODE !== "bootstrap";
  if (verifyOnly) {
    const [state] = await _neon.query(`SELECT
      (SELECT COUNT(*) FROM ccs_migrations WHERE version IN ('20261021_integrity_v1','20261021_workflows_v1','20261021_integrity_v2')) AS migrations,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('ccs_users','ccs_posts','ccs_site_settings','ccs_announcements','ccs_tickets') AND column_name='version') AS version_columns,
      (SELECT COUNT(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN ('ccs_users_version','ccs_posts_version','ccs_settings_version','ccs_announcements_version','ccs_tickets_version')) AS version_triggers`);
    if (
      Number(state.migrations) !== 3 ||
      Number(state.version_columns) !== 5 ||
      Number(state.version_triggers) !== 5
    )
      throw new Error(
        "Database migration required. Run the admin integrity migration before serving this release.",
      );
  } else {
    await _neon.transaction([
      _neon.query("SELECT pg_advisory_xact_lock(73194200)"),
      ...ddlFragments().map((chunk) => _neon.query(chunk)),
    ]);
  }

  _db ||= drizzle(_neon, { schema });
}

export async function getDb() {
  if (!_db) await ensureReady();
  return _db;
}

export async function runDbTransaction(statements) {
  await ensureReady();
  return _neon.transaction(
    statements.map(([text, params = []]) => _neon.query(text, params)),
    { isolationLevel: "ReadCommitted" },
  );
}

export async function queryDb(text, params = []) {
  await ensureReady();
  return _neon.query(text, params);
}

/** Single-flight client initialization; production verifies the migration ledger. */
export async function ensureReady() {
  if (_db) return;
  _initPromise ||= initialize();
  try {
    await _initPromise;
  } catch (error) {
    _initPromise = null;
    throw error;
  }
}
