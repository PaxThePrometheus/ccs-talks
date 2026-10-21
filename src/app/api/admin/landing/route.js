import { objectBody } from "@/lib/ccs/requestValidation.mjs";
import { staffRoute } from "@/lib/ccs/staffRoute";
import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { getPublicLandingBundle, requireStaff, saveLandingCms, landingRevisions, restoreLandingCms } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

async function GETHandler() {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { adminOnly: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const bundle = await getPublicLandingBundle();
  return NextResponse.json({...bundle,revisions:await landingRevisions()});
}

async function PATCHHandler(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { adminOnly: true, recentAuth: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  objectBody(body);
  const out = "restoreRevisionId" in body ? await restoreLandingCms(gate.row.id,body.restoreRevisionId,body.expectedVersion) : await saveLandingCms(gate.row.id, body);
  if (out?.error) return NextResponse.json({ error: out.error }, { status: out.status });

  const bundle = await getPublicLandingBundle();
  return NextResponse.json({...bundle,revisions:await landingRevisions()});
}

export const GET = staffRoute(GETHandler);
export const PATCH = staffRoute(PATCHHandler);
