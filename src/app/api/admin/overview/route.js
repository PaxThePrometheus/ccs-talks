import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { getOverview, requireStaff } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const data = await getOverview();
  return NextResponse.json({ ...data, viewer: { id: gate.row.id, role: gate.row.role } });
}
