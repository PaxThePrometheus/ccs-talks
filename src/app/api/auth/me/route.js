import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { resolveViewerFromSession } from "@/lib/ccs/store";
import { toPublicProfile } from "@/lib/ccs/publicUser";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureReady();
  const token = await readSessionTokenFromCookies();

  const user = await resolveViewerFromSession(token);
  if (!user?.profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ profile: toPublicProfile(user.profile) });
}
