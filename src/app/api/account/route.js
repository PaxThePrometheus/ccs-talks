import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { patchAccountBundles, resolveViewerFromSession } from "@/lib/ccs/store";

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

  const out = await patchAccountBundles(viewer.id, body);
  if (out?.unauthorized) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (out?.handleTaken) return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
  if (out?.mediaTooLarge) return NextResponse.json({ error: out.message || "Image too large." }, { status: 413 });

  return NextResponse.json(out.wire);
}
