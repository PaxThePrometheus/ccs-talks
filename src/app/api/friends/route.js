import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { friendPerformAction, resolveViewerFromSession } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function POST(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const out = await friendPerformAction(viewer.id, body);
  if (out.error === "missing_user") return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (out.error === "invalid_target") return NextResponse.json({ error: "Invalid target." }, { status: 400 });
  if (out.error === "already_friends") return NextResponse.json({ error: "Already friends." }, { status: 409 });
  if (out.error === "pending_or_exists") return NextResponse.json({ error: "Request already pending." }, { status: 409 });
  if (out.error === "bad_request") return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (out.error === "unknown_action") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (out.wire) return NextResponse.json({ ok: true, ...out.wire });

  return NextResponse.json({ error: "Friend action failed." }, { status: 400 });
}
