import { NextResponse } from "next/server";
import { sanitizeEmail } from "@/lib/ccs/auth";
import { attachSessionCookie } from "@/lib/ccs/cookiesHdr";
import { ensureReady } from "@/lib/ccs/drizzle-client";
import { registerAccountRow } from "@/lib/ccs/store";
import { getSiteSettings } from "@/lib/ccs/admin";
import { toPublicProfile } from "@/lib/ccs/publicUser";

export const dynamic = "force-dynamic";

function handleFromEmail(email) {
  const local = (email.split("@")[0] || "student").replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return local.slice(0, 28) || "student";
}

export async function POST(request) {
  await ensureReady();

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = sanitizeEmail(body.email);
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  if (!email || !password || !name) {
    return NextResponse.json({ error: "Missing name, email, or password." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password should be at least 8 characters." }, { status: 400 });
  }

  /** Honor site-wide "Registration is open" flag set by an administrator. */
  const settings = await getSiteSettings();
  if (settings.registrationOpen === false) {
    return NextResponse.json({ error: "New account registration is currently closed by an administrator." }, { status: 403 });
  }

  const requestedHandle = typeof body.handle === "string" ? body.handle : "";

  try {
    const payload = await registerAccountRow(email, password, name, handleFromEmail(email), {
      requestedHandle,
    });

    if (payload?.conflict) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (payload?.handleTaken) {
      return NextResponse.json({ error: "That username handle is already taken. Pick another." }, { status: 409 });
    }

    const res = NextResponse.json({ profile: toPublicProfile(payload.profile) }, { status: 201 });
    attachSessionCookie(res, payload.token, payload.expiresAt);
    return res;
  } catch {
    return NextResponse.json({ error: "Could not register right now." }, { status: 503 });
  }
}
