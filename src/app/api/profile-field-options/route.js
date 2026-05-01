import { NextResponse } from "next/server";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { getMergedProfileFieldOptions } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

/** Public: profile dropdown choices (configured in admin site settings). */
export async function GET() {
  await ensureReady();
  const options = await getMergedProfileFieldOptions();
  return NextResponse.json({ options });
}
