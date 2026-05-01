import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { listAudit, requireStaff } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 100);

  const entries = await listAudit({ limit });
  return NextResponse.json({ entries });
}
