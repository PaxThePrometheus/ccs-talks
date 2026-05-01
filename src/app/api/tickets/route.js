import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { createTicketForUser, listTicketsForUser, resolveViewerFromSession } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const tickets = await listTicketsForUser(viewer.id);
  return NextResponse.json({ tickets });
}

export async function POST(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const viewer = await resolveViewerFromSession(token);
  if (!viewer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const out = await createTicketForUser(viewer.id, body);
  if (out?.error) return NextResponse.json({ error: out.error }, { status: out.status || 400 });
  return NextResponse.json(out);
}
