import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { requireStaff, staffListOpenReports } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const url = new URL(request.url);
  const lim = Number(url.searchParams.get("limit") || "");

  const out = await staffListOpenReports(gate.row, { limit: lim });
  if (out.error) return NextResponse.json({ error: out.error }, { status: out.status || 403 });
  return NextResponse.json(out);
}
