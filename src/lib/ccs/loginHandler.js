import { randomUUID } from "node:crypto";
import { queryDb } from "./drizzle-client";
import { NextResponse } from "next/server";
import { attachSessionCookie } from "./cookiesHdr";
import { loginAccountRow } from "./store";
import { toPublicProfile } from "./publicUser";
import { consumeLoginAttempt, parseLogin } from "./loginSecurity";

export async function signIn(request, staffOnly = false) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const credentials = parseLogin(body);
  if (!credentials) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  try {
    const limit = await consumeLoginAttempt(credentials.email);
    if (!limit.allowed) return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, {
      status: 429, headers: { "Retry-After": String(limit.retryAfter) },
    });
    const result = await loginAccountRow(credentials.email, credentials.password, { staffOnly, code: typeof body.code === "string" ? body.code : "" });
    if (result?.fail || result?.banned) {
      if (staffOnly) await queryDb("INSERT INTO ccs_audit_log(id,actor_id,action,target_id,meta,created_at) VALUES($1,'anonymous','staff_login_failed','','{}'::jsonb,$2)",[`a_${randomUUID()}`,Date.now()]);
      return NextResponse.json({ error: "Unable to sign in with these credentials." }, { status: 401 });
    }
    const response = NextResponse.json({ profile: toPublicProfile(result.profile) });
    response.headers.set("Cache-Control", "no-store");
    attachSessionCookie(response, result.token, result.expiresAt);
    return response;
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
