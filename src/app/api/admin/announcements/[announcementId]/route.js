import { staffRoute } from "@/lib/ccs/staffRoute";
import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { deleteAnnouncementAdmin, patchAnnouncementAdmin, requireStaff } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

async function DELETEHandler(_request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { adminOnly: true, recentAuth: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { announcementId } = await params;
  const out = await deleteAnnouncementAdmin(gate.row, announcementId);
  if (out?.error) return NextResponse.json({ error: out.error }, { status: out.status || 400 });
  return NextResponse.json(out);
}

export const DELETE = staffRoute(DELETEHandler);

async function PATCHHandler(request,{params}) {
  const token=await readSessionTokenFromCookies();
  const gate=await requireStaff(token,{adminOnly:true,recentAuth:true});
  if (gate.error) return NextResponse.json({error:gate.error},{status:gate.status});
  let body; try {body=await request.json();} catch {return NextResponse.json({error:"Invalid JSON body."},{status:400});}
  const {announcementId}=await params;
  const out=await patchAnnouncementAdmin(gate.row,announcementId,body);
  return NextResponse.json(out,{status:out.error ? out.status : 200});
}
export const PATCH=staffRoute(PATCHHandler);
