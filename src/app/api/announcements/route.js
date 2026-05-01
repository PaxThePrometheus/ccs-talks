import { NextResponse } from "next/server";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { listAnnouncementsPublic } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureReady();
  const announcements = await listAnnouncementsPublic();
  return NextResponse.json({ announcements });
}
