import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { createUserPost, fetchPublicFeed, resolveViewerFromSession } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await ensureReady();
  const url = new URL(request.url);
  const tag = url.searchParams.get("tag");
  const token = await readSessionTokenFromCookies();

  try {
    const viewer = token ? await resolveViewerFromSession(token) : null;
    const payload = await fetchPublicFeed(viewer?.id ?? null, tag);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Database unavailable.", posts: [], users: {} }, { status: 503 });
  }
}

export async function POST(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = String(payload.content || "").trim();
  const tag = String(payload.tag || "General").trim() || "General";
  if (!content) return NextResponse.json({ error: "Post content is empty." }, { status: 400 });

  try {
    const viewer = await resolveViewerFromSession(token);
    if (!viewer) return NextResponse.json({ error: "Sign in to post." }, { status: 401 });

    const created = await createUserPost(viewer.id, content, tag);
    return NextResponse.json({ post: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not publish post." }, { status: 503 });
  }
}
