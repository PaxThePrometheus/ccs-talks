import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/ccs/cookiesHdr";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { revokeSessionToken } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const token = await readSessionTokenFromCookies();
    if (token) {
      await ensureReady();
      await revokeSessionToken(token);
    }
    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
  } catch {
    return NextResponse.json({ error: "Could not sign out. Please retry." }, { status: 503 });
  }
}
