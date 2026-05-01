import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { fetchVisitProfileBundle, patchUserProfile, resolveViewerFromSession } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await ensureReady();
  const url = new URL(request.url);
  const visitUserId = url.searchParams.get("visitUserId");

  if (!visitUserId || typeof visitUserId !== "string" || !visitUserId.trim()) {
    return NextResponse.json({ error: "visitUserId is required." }, { status: 400 });
  }

  try {
    const bundle = await fetchVisitProfileBundle(visitUserId.trim());
    if (!bundle) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(bundle);
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}

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
  if (patched?.usernameCooldown) {
    return NextResponse.json(
      { error: "You can only change your username once every seven days.", nextAllowedAt: patched.nextAllowedAt },
      { status: 429 }
    );
  }
  if (patched?.handleTaken) return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
  if (patched?.mediaTooLarge) return NextResponse.json({ error: patched.message || "Image too large." }, { status: 413 });

  return NextResponse.json(patched);
}
