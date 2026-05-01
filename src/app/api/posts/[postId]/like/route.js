import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { resolveViewerFromSession, togglePostLikeDb } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function POST(_request, ctx) {
  await ensureReady();
  const { postId } = await ctx.params;
  const token = await readSessionTokenFromCookies();

  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Sign in to react to posts." }, { status: 401 });

  const out = await togglePostLikeDb(postId, viewer.id);

  if (out?.missing) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  return NextResponse.json(out);
}
