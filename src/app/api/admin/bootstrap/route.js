import { NextResponse } from "next/server";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { bootstrapStatus } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureReady();
  const status = await bootstrapStatus();
  return NextResponse.json(status);
}
