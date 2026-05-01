import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { deleteAnnouncementAdmin, requireStaff } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function DELETE(_request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { adminOnly: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { announcementId } = await params;
  const out = await deleteAnnouncementAdmin(gate.row, announcementId);
  if (out?.error) return NextResponse.json({ error: out.error }, { status: out.status || 400 });
  return NextResponse.json(out);
}
