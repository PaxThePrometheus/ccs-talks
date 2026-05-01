import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { deleteCommentEnvelope, resolveViewerFromSession, updateCommentEnvelope } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function PATCH(request, ctx) {
  await ensureReady();
  const { postId, commentId } = await ctx.params;
  const token = await readSessionTokenFromCookies();
  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Sign in to edit comments." }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = String(body.text ?? "");
  const out = await updateCommentEnvelope(postId, commentId, viewer.id, text);

  if (out?.empty) return NextResponse.json({ error: "Comment text is empty." }, { status: 400 });
  if (out?.tooLong) return NextResponse.json({ error: "Comment is too long." }, { status: 413 });
  if (out?.missing) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (out?.forbidden) return NextResponse.json({ error: "You can only edit your own comments." }, { status: 403 });

  return NextResponse.json(out);
}

export async function DELETE(_request, ctx) {
  await ensureReady();
  const { postId, commentId } = await ctx.params;
  const token = await readSessionTokenFromCookies();
  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Sign in to delete comments." }, { status: 401 });

  const out = await deleteCommentEnvelope(postId, commentId, viewer.id);

  if (out?.missingPost) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (out?.missing) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  if (out?.forbidden) return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 });

  return NextResponse.json(out);
}
