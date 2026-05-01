import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import {
  adminDeletePost,
  adminEditPost,
  adminPinPost,
  requireStaff,
} from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

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

  const { postId } = await params;

  if (typeof body.pinned === "boolean") {
    await adminPinPost(gate.row, postId, body.pinned);
  }
  if (typeof body.content === "string") {
    await adminEditPost(gate.row, postId, body.content);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request, { params }) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { postId } = await params;
  await adminDeletePost(gate.row, postId);
  return NextResponse.json({ ok: true });
}
