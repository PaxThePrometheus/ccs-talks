import { NextResponse } from "next/server";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { listAllPosts, requireStaff } from "@/lib/ccs/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  await ensureReady();
  const token = await readSessionTokenFromCookies();
  const gate = await requireStaff(token);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";

  const posts = await listAllPosts({ q });
  return NextResponse.json({ posts });
}
