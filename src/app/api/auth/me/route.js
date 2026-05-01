import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { getAccountWire } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureReady();
  const token = await readSessionTokenFromCookies();

  const wire = await getAccountWire(token);
  if (!wire?.profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(wire);
}
