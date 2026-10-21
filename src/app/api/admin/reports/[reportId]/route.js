import { objectBody } from "@/lib/ccs/requestValidation.mjs";
import { staffRoute } from "@/lib/ccs/staffRoute";
import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { requireStaff, staffResolveForumReport } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

async function PATCHHandler(request, ctx) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { recentAuth: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { reportId } = await ctx.params;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  objectBody(body,["status","note","removePost"]);
  const status = typeof body.status === "string" ? body.status.trim() : "";
  const out = await staffResolveForumReport(gate.row, reportId, status, body.note ?? "", body.removePost ?? false);
  if (out?.error === "not_found") return NextResponse.json({ error: out.error }, { status: 404 });
  if (out?.error === "already_closed") return NextResponse.json({ error: out.error }, { status: 409 });
  if (out?.error === "invalid_status") return NextResponse.json({ error: out.error }, { status: 400 });
  if (out?.error === "forbidden") return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}

export const PATCH = staffRoute(PATCHHandler);
