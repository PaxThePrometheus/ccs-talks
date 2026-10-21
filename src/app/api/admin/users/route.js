import { adminListPage } from "@/lib/ccs/adminListPage";
import { staffRoute } from "@/lib/ccs/staffRoute";
import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { listUsers, requireStaff } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

async function GETHandler(request) {
  const token=await readSessionTokenFromCookies();
  const gate=await requireStaff(token);
  if (gate.error) return NextResponse.json({error:gate.error},{status:gate.status});
  return NextResponse.json(await adminListPage("users",new URL(request.url).searchParams));
}

export const GET = staffRoute(GETHandler);
