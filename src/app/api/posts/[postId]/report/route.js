import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { createUserReport, resolveViewerFromSession } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function POST(request, ctx) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Sign in to report posts." }, { status: 401 });

  const { postId } = await ctx.params;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const reason = String(body.reason ?? "Reported").trim();

  const out = await createUserReport(viewer.id, postId, reason);
  if (out.missing) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (out.duplicate) return NextResponse.json({ error: "You already reported this post.", code: "duplicate" }, { status: 409 });
  return NextResponse.json({ ok: true, reportId: out.reportId });
}
