import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { fetchSinglePostEnvelope, resolveViewerFromSession, updatePostBody } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function GET(_request, ctx) {
  await ensureReady();
  const { postId } = await ctx.params;
  const token = await readSessionTokenFromCookies();
  const viewer = await resolveViewerFromSession(token);
  const viewerId = viewer?.id || null;

  const env = await fetchSinglePostEnvelope(viewerId, postId);
  if (!env) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  return NextResponse.json({ post: env.post, users: env.users });
}

export async function PATCH(request, ctx) {
  await ensureReady();
  const { postId } = await ctx.params;
  const token = await readSessionTokenFromCookies();

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const content = String(payload.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Content is empty." }, { status: 400 });

  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const updated = await updatePostBody(postId, viewer.id, content);

  if (updated?.missing) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (updated?.forbidden) return NextResponse.json({ error: "You can only edit your own posts." }, { status: 403 });

  return NextResponse.json(updated);
}
