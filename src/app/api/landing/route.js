import { staffRoute } from "@/lib/ccs/staffRoute";
import { NextResponse } from "next/server";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { getPublicLandingBundle } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

/** Public payload for the marketing landing + forum rails; short cache for snappy updates. */
async function GETHandler() {
  await ensureReady();
  const bundle = await getPublicLandingBundle();
  return NextResponse.json(bundle, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export const GET=staffRoute(GETHandler);
