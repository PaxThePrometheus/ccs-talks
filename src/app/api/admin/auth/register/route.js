import { NextResponse } from "next/server";
import { attachSessionCookie } from "@/lib/ccs/cookiesHdr";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { registerAdminAccount } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  await ensureReady();

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const out = await registerAdminAccount(body);
    if (out?.error) {
      return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
    }

    const res = NextResponse.json(
      { profile: out.profile, role: out.role, bootstrap: !!out.bootstrap, promoted: !!out.promoted },
      { status: 201 }
    );
    attachSessionCookie(res, out.token, out.expiresAt);
    return res;
  } catch {
    return NextResponse.json({ error: "Could not register administrator." }, { status: 503 });
  }
}
