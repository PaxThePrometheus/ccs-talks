import { objectBody, RequestError } from "@/lib/ccs/requestValidation.mjs";
import { staffRoute } from "@/lib/ccs/staffRoute";
import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import {
  deleteUserCascade,
  getUserDetailById,
  patchUserProfileAsStaff,
  requireStaff,
  setUserBadges,
  setUserBanned,
  setUserRole,
  setUserStatus,
} from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

async function GETHandler(_request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { userId } = await params;
  const user = await getUserDetailById(userId);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ user });
}

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

  const { userId } = await params;
  objectBody(body,["role","banned","bannedReason","profile","badges","status","expectedVersion"]);
  const actions=["role","banned","profile","badges","status"].filter(key=>key in body);
  if (actions.length!==1) throw new RequestError("Supply exactly one account change at a time.");
  if ("bannedReason" in body && !("banned" in body)) throw new RequestError("Ban reason requires a ban change.");
  const current=await getUserDetailById(userId);
  if (!current) return NextResponse.json({error:"Not found."},{status:404});
  if (body.expectedVersion!==undefined && body.expectedVersion!==current.version) throw new RequestError("This account changed. Reload it before saving again.",409);

  if (typeof body.role === "string") {
    const out = await setUserRole(gate.row, userId, body.role, body.expectedVersion);
    if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
    return NextResponse.json(out);
  }

  if (typeof body.banned === "boolean") {
    const out = await setUserBanned(gate.row, userId, body.banned, body.bannedReason || "", body.expectedVersion);
    if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
    return NextResponse.json(out);
  }

  if (typeof body.profile === "object" && body.profile !== null && !Array.isArray(body.profile)) {
    const out = await patchUserProfileAsStaff(gate.row, userId, body.profile, body.expectedVersion);
    if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
    return NextResponse.json(out);
  }

  if (Array.isArray(body.badges)) {
    const out = await setUserBadges(gate.row, userId, body.badges, body.expectedVersion);
    if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
    return NextResponse.json(out);
  }

  if (typeof body.status === "string") {
    const out = await setUserStatus(gate.row, userId, body.status, body.expectedVersion);
    if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
    return NextResponse.json(out);
  }

  return NextResponse.json({ error: "No actionable fields." }, { status: 400 });
}

async function DELETEHandler(_request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { adminOnly: true, recentAuth: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { userId } = await params;
  const out = await deleteUserCascade(gate.row, userId);
  if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
  return NextResponse.json(out);
}

export const GET = staffRoute(GETHandler);
export const PATCH = staffRoute(PATCHHandler);
export const DELETE = staffRoute(DELETEHandler);
