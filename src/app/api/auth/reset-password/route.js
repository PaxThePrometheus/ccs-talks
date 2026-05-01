import { NextResponse } from "next/server";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { completePasswordReset } from "@/lib/ccs/passwordReset";

export const dynamic = "force-dynamic";

export async function POST(request) {
  await ensureReady();

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const out = await completePasswordReset(body.token, body.password);
  if (out?.error) {
    return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
  }
  return NextResponse.json({ ok: true, message: "Password updated. You can sign in with your new password." });
}
