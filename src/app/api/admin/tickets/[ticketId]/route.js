import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { requireStaff, updateTicketStaff } from "@/lib/ccs/admin";

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

  const { ticketId } = await params;
  const out = await updateTicketStaff(gate.row, ticketId, body);
  if (out?.error) return NextResponse.json({ error: out.error }, { status: out.status || 400 });
  return NextResponse.json(out);
}
