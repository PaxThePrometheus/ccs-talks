import { NextResponse } from "next/server";
import { sanitizeEmail } from "@/lib/ccs/auth";
import { attachSessionCookie } from "@/lib/ccs/cookiesHdr";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { loginAccountRow } from "@/lib/ccs/store";
import { toPublicProfile } from "@/lib/ccs/publicUser";

export const dynamic = "force-dynamic";

export async function POST(request) {
  await ensureReady();

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = sanitizeEmail(body.email);
  const password = String(body.password || "");
  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password." }, { status: 400 });
  }

  try {
    const result = await loginAccountRow(email, password);

    if (result?.fail) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }
    if (result?.banned) {
      return NextResponse.json(
        { error: result.reason ? `Account suspended: ${result.reason}` : "This account has been suspended." },
        { status: 403 }
      );
    }

    const res = NextResponse.json({ profile: toPublicProfile(result.profile) }, { status: 200 });
    attachSessionCookie(res, result.token, result.expiresAt);
    return res;
  } catch {
    return NextResponse.json({ error: "Could not sign in." }, { status: 503 });
  }
}
