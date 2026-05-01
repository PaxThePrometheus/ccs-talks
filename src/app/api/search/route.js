import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { resolveViewerFromSession, searchForumPostsEnvelope } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await ensureReady();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const tag = url.searchParams.get("tag") || "";
  const cursor = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw != null && limitRaw !== "" ? Number(limitRaw) : undefined;

  const token = await readSessionTokenFromCookies();
  const viewer = token ? await resolveViewerFromSession(token) : null;

  try {
    const payload = await searchForumPostsEnvelope(viewer?.id ?? null, { q, tag, cursor: cursor || null, limit });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Search unavailable.", posts: [], users: {}, nextCursor: null }, { status: 503 });
  }
}
