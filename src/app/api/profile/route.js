import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { patchUserProfile, resolveViewerFromSession } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function PATCH(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const patched = await patchUserProfile(viewer.id, body);
  if (patched?.unauthorized) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  return NextResponse.json(patched);
}
