import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { listTicketsAdmin, requireStaff } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";

  const tickets = await listTicketsAdmin({ status });
  return NextResponse.json({ tickets });
}
