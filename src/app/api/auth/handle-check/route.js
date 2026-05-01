import { NextResponse } from "next/server";
import { ensureReady, getDb } from "@/lib/ccs/drizzle-client";
import { isHandleTaken } from "@/lib/ccs/store";

export const dynamic = "force-dynamic";

function sanitizeRequestedHandle(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^\w.]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

/** Public: is this handle available? (case-insensitive) */
export async function GET(request) {
  await ensureReady();
  const url = new URL(request.url);
  const h = sanitizeRequestedHandle(url.searchParams.get("h") || "");
  if (!h) {
    return NextResponse.json({ available: false, reason: "empty" });
  }

  try {
    const db = await getDb();
    const taken = await isHandleTaken(db, h);
    return NextResponse.json({ available: !taken, handle: h });
  } catch {
    return NextResponse.json({ available: false, reason: "error" }, { status: 503 });
  }
}
