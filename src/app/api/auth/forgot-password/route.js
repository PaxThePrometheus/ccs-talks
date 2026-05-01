import { NextResponse } from "next/server";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { requestPasswordResetByEmail } from "@/lib/ccs/passwordReset";

export const dynamic = "force-dynamic";

export async function POST(request) {
  await ensureReady();

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  await requestPasswordResetByEmail(body.email);
  return NextResponse.json({
    ok: true,
    message: "If that email matches an account, you will receive reset instructions shortly.",
  });
}
