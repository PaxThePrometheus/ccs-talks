import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/ccs/cookiesHdr";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { revokeSessionToken } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function POST() {
  await ensureReady();
  const token = await readSessionTokenFromCookies();

  await revokeSessionToken(token);

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
