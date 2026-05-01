import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { addCommentEnvelope, listCommentsEnvelope, resolveViewerFromSession } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function GET(_request, ctx) {
  await ensureReady();
  const { postId } = await ctx.params;

  const data = await listCommentsEnvelope(postId);
  if (!data) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  return NextResponse.json({ comments: data.mapped, users: data.users });
}

export async function POST(request, ctx) {
  await ensureReady();
  const { postId } = await ctx.params;
  const token = await readSessionTokenFromCookies();

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = String(body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Comment text is empty." }, { status: 400 });

  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });

  const out = await addCommentEnvelope(postId, viewer.id, text);

  if (out?.missing) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  return NextResponse.json(out, { status: 201 });
}
