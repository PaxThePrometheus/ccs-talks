import { staffRoute } from "@/lib/ccs/staffRoute";
import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import {
  adminDeletePost,
  adminPatchPost,
  postModerationDetail,
  requireStaff,
} from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

async function PATCHHandler(request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { recentAuth: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { postId } = await params;

  const out=await adminPatchPost(gate.row,postId,body);
  return NextResponse.json(out, {status:out.error ? out.status : 200});
}

async function DELETEHandler(_request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { recentAuth: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { postId } = await params;
  const out=await adminDeletePost(gate.row, postId);
  return NextResponse.json(out, {status:out.error ? out.status : 200});
}

export const PATCH = staffRoute(PATCHHandler);
export const DELETE = staffRoute(DELETEHandler);

async function GETHandler(_request,{params}) {
  const token=await readSessionTokenFromCookies();const gate=await requireStaff(token);
  if(gate.error)return NextResponse.json({error:gate.error},{status:gate.status});
  const {postId}=await params;return NextResponse.json(await postModerationDetail(gate.row,postId));
}
export const GET=staffRoute(GETHandler);
