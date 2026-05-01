import { neon } from "@neondatabase/serverless";
import { count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { ddlFragments } from "./drizzle-bootstrap";
import * as schema from "./schema";
import { MOCK_POSTS } from "@/components/ccs-talks/config/appConfig";

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

async function seedDemoPostsIfEmpty(ddb) {
  const [row] = await ddb.select({ n: count() }).from(schema.ccsPosts);
  if (Number(row?.n ?? 0) > 0) return;

  const now = Date.now();
  await ddb.insert(schema.ccsPosts).values(
    MOCK_POSTS.map((p, i) => ({
      id: `seed_${p.id}`,
      userId: p.userId,
      content: p.content,
      tag: p.tag ?? "General",
      imageUrl: "",
      createdAt: now - (5 - Math.min(i, 4)) * 3600_000 - i * 120_000,
      likedBy: [],
      commentCount: typeof p.comments === "number" ? p.comments : 0,
      pinned: !!p.pinned,
    }))
  );
}

async function initialize() {
  const url = requireDatabaseUrl();
  _neon ||= neon(url);
  const ddlRunner = drizzle(_neon);

  for (const chunk of ddlFragments()) {
    await ddlRunner.execute(sql.raw(chunk));
  }

  _db ||= drizzle(_neon, { schema });
  await seedDemoPostsIfEmpty(_db);
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
