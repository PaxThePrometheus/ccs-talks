import { auditedMutation } from "@/lib/ccs/auditedMutation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/ccs/admin";
import { verifyPassword } from "@/lib/ccs/auth";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { getDb } from "@/lib/ccs/drizzle-client";
import { consumeLoginAttempt } from "@/lib/ccs/loginSecurity";
import { ccsSessions } from "@/lib/ccs/schema";
import { verifyMfa } from "@/lib/ccs/mfa";

export async function POST(request) {
  try {
    const token = await readSessionTokenFromCookies();
    const gate = await requireStaff(token);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => null);
    if (typeof body?.password !== "string" || !body.password || body.password.length > 1024) {
      return NextResponse.json({ error: "Enter your password." }, { status: 400 });
    }
    const limit = await consumeLoginAttempt(gate.row.email);
    if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    if (!await verifyPassword(body.password, gate.row.passwordSalt, gate.row.passwordHash)) {
      return NextResponse.json({ error: "Unable to verify your password." }, { status: 401 });
    }
    if (!await verifyMfa(gate.row.id, body.code)) return NextResponse.json({ error: "Unable to verify authenticator or recovery code." }, { status: 401 });
    await auditedMutation(gate.row.id,"staff_reauth",gate.row.id,
      "UPDATE ccs_sessions SET authenticated_at=$1 WHERE token=$2",[Date.now(),token]);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Verification is temporarily unavailable." }, { status: 503 });
  }
}
