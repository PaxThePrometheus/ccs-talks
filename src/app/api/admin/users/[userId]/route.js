import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import {
  deleteUserCascade,
  getUserDetailById,
  requireStaff,
  setUserBadges,
  setUserBanned,
  setUserRole,
} from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { userId } = await params;
  const user = await getUserDetailById(userId);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { userId } = await params;

  if (typeof body.role === "string") {
    const out = await setUserRole(gate.row, userId, body.role);
    if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
    return NextResponse.json(out);
  }

  if (typeof body.banned === "boolean") {
    const out = await setUserBanned(gate.row, userId, body.banned, body.bannedReason || "");
    if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
    return NextResponse.json(out);
  }

  if (Array.isArray(body.badges)) {
    const out = await setUserBadges(gate.row, userId, body.badges);
    if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
    return NextResponse.json(out);
  }

  return NextResponse.json({ error: "No actionable fields." }, { status: 400 });
}

export async function DELETE(_request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token, { adminOnly: true });
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { userId } = await params;
  const out = await deleteUserCascade(gate.row, userId);
  if (out?.error) return NextResponse.json({ error: out.message || out.error }, { status: out.status || 400 });
  return NextResponse.json(out);
}
