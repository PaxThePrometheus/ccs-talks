import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { createAnnouncementAdmin, listAnnouncementsPublic, requireStaff } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const announcements = await listAnnouncementsPublic();
  return NextResponse.json({ announcements });
}

export async function POST(request) {
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

  const out = await createAnnouncementAdmin(gate.row, body);
  if (out?.error) return NextResponse.json({ error: out.error }, { status: out.status || 400 });
  return NextResponse.json(out);
}
