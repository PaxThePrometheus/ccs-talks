import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { presenceReadmany, presenceTouch, resolveViewerFromSession } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function POST() {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const viewer = await resolveViewerFromSession(token);
  if (viewer?.id) await presenceTouch(viewer.id);
  return NextResponse.json({ ok: true });
}

export async function GET(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();

  try {
    const viewer = token ? await resolveViewerFromSession(token) : null;
    const url = new URL(request.url);
    const ids = (url.searchParams.get("ids") || "").split(",").map((x) => x.trim()).filter(Boolean);

    const online = await presenceReadmany(ids, viewer?.id ?? null);

    return NextResponse.json({ online });
  } catch {
    return NextResponse.json({ error: "presence_failed" }, { status: 503 });
  }
}
