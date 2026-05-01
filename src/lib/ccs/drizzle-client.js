import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
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
      "[ccs-talks] DATABASE_URL is missing. Use Neon (free tier): create a project, copy the Postgres connection string, add it as DATABASE_URL on Vercel and in local .env.local."
    );
  }
  return url;
}

async function initialize() {
  const url = requireDatabaseUrl();
  _neon ||= neon(url);
  const ddlRunner = drizzle(_neon);

  for (const chunk of ddlFragments()) {
    await ddlRunner.execute(sql.raw(chunk));
  }

  _db ||= drizzle(_neon, { schema });
}

export async function getDb() {
  if (!_db) await ensureReady();
  return _db;
}

/** Idempotent DDL + seed; safe across serverless runners. */
export async function ensureReady() {
  if (_db) return;
  _initPromise ||= initialize();
  await _initPromise;
}
