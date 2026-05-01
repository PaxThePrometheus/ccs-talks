import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { getSiteSettings, requireStaff, setSiteSettings } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { adminOnly: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const settings = await setSiteSettings(gate.row.id, body);
  return NextResponse.json({ settings });
}
