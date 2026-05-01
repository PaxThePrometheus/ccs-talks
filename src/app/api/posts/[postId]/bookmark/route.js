import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { resolveViewerFromSession, toggleBookmarkDb } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function POST(_request, ctx) {
  await ensureReady();
  const { postId } = await ctx.params;
  const token = await readSessionTokenFromCookies();

  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Sign in to bookmark." }, { status: 401 });

  const out = await toggleBookmarkDb(postId, viewer.id);

  if (out?.missing) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (out?.unauthorized) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  return NextResponse.json(out);
}
