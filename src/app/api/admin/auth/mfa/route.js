import { auditedMutation } from "@/lib/ccs/auditedMutation";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { appendAudit, requireStaff } from "@/lib/ccs/admin";
import { readSessionTokenFromCookies } from "@/lib/ccs/cookiesRead";
import { getDb } from "@/lib/ccs/drizzle-client";
import { consumeLoginAttempt } from "@/lib/ccs/loginSecurity";
import { resultRows, verifyMfa } from "@/lib/ccs/mfa";
import { decryptSecret, encryptSecret, mfaConfigured, newMfaSecret, newRecoveryCodes, recoveryHash, validCounter } from "@/lib/ccs/mfaCrypto.mjs";

export const dynamic = "force-dynamic";

async function handle(request) {
  try {
    const token = await readSessionTokenFromCookies();
    const gate = await requireStaff(token, { recentAuth: request.method !== "GET" });
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const db = await getDb();
    const id = gate.row.id;
    const [row] = resultRows(await db.execute(sql`SELECT * FROM ccs_staff_mfa WHERE user_id = ${id}`));
    if (request.method === "GET") return NextResponse.json({ enabled: !!row?.enabled, configured: mfaConfigured() }, { headers: { "Cache-Control": "no-store" } });
    if (!mfaConfigured()) return NextResponse.json({ error: "Authenticator setup is unavailable. Contact the deployment owner." }, { status: 503 });
    const limit = await consumeLoginAttempt(gate.row.email);
    if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    if (request.method === "POST") {
      const secret = newMfaSecret();
      const encrypted = encryptSecret(secret, id);
      await auditedMutation(id,"mfa_setup_started",id,
        "INSERT INTO ccs_staff_mfa(user_id,encrypted_secret) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET encrypted_secret=EXCLUDED.encrypted_secret,last_counter=-1 WHERE NOT ccs_staff_mfa.enabled",[id,encrypted]);
      return NextResponse.json({ secret }, { headers: { "Cache-Control": "no-store" } });
    }
    const body = await request.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (request.method === "PUT") {
      if (!row || row.enabled) return NextResponse.json({ error: "Start authenticator setup first." }, { status: 409 });
      const counter = validCounter(decryptSecret(row.encrypted_secret, id), code);
      if (counter === null) return NextResponse.json({ error: "Invalid authenticator code." }, { status: 400 });
      const codes = newRecoveryCodes();
      const hashes = Object.fromEntries(codes.map((value) => [recoveryHash(value, id), true]));
      await auditedMutation(id,"mfa_enabled",id,
        "UPDATE ccs_staff_mfa SET enabled=true,last_counter=$1,recovery_hashes=$2::jsonb WHERE user_id=$3 AND NOT enabled AND encrypted_secret=$4",[counter,JSON.stringify(hashes),id,row.encrypted_secret],{},null,null,null,id);
      return NextResponse.json({ recoveryCodes: codes }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!await verifyMfa(id, code, { allowUnenrolled: false })) return NextResponse.json({ error: "Invalid authenticator or recovery code." }, { status: 400 });
    await auditedMutation(id,"mfa_disabled",id,"DELETE FROM ccs_staff_mfa WHERE user_id=$1",[id],{},null,null,null,id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Authenticator settings are temporarily unavailable." }, { status: 503 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
