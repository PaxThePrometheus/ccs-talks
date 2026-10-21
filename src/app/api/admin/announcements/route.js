import { adminListPage } from "@/lib/ccs/adminListPage";
import { staffRoute } from "@/lib/ccs/staffRoute";
import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { createAnnouncementAdmin, listAnnouncementsPublic, requireStaff } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

async function GETHandler(request) {
  const token=await readSessionTokenFromCookies();
  const gate=await requireStaff(token);
  if (gate.error) return NextResponse.json({error:gate.error},{status:gate.status});
  return NextResponse.json(await adminListPage("announcements",new URL(request.url).searchParams));
}

async function POSTHandler(request) {
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

  const out = await createAnnouncementAdmin(gate.row, body);
  if (out?.error) return NextResponse.json({ error: out.error }, { status: out.status || 400 });
  return NextResponse.json(out);
}

export const GET = staffRoute(GETHandler);
export const POST = staffRoute(POSTHandler);
