import { createHash } from "node:crypto";
import { resultRows } from "./mfaVerification.mjs";

export const LOGIN_WINDOW_MS = 15 * 60_000;

async function attempt(query, label, maximum, now) {
  const key = createHash("sha256").update(label).digest("hex");
  const [row] = resultRows(await query(`
    INSERT INTO ccs_auth_attempts (key, attempts, resets_at) VALUES ($1, 1, $2)
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN ccs_auth_attempts.resets_at <= $3 THEN 1 ELSE ccs_auth_attempts.attempts + 1 END,
      resets_at = CASE WHEN ccs_auth_attempts.resets_at <= $3 THEN $2 ELSE ccs_auth_attempts.resets_at END
    RETURNING attempts, resets_at`, [key, now + LOGIN_WINDOW_MS, now]));
  return { allowed: row.attempts <= maximum, retryAfter: Math.max(1, Math.ceil((Number(row.resets_at) - now) / 1000)) };
}

export async function consumeLoginWithQuery(query, email, now = Date.now()) {
  // Global ceiling bounds hashing/record growth even with rotating emails.
  const global = await attempt(query, "login:deployment", 3000, now);
  if (!global.allowed) return global;
  await query("DELETE FROM ccs_auth_attempts WHERE resets_at < $1", [now - 24 * 60 * 60_000]);
  return attempt(query, `login:${email.trim().toLowerCase()}`, 10, now);
}

export function parseLogin(body) {
  if (!body || Array.isArray(body) || typeof body !== "object") return null;
  if (typeof body.email !== "string" || typeof body.password !== "string") return null;
  const email = body.email.trim().toLowerCase();
  if (!email || email.length > 254 || !body.password || body.password.length > 1024) return null;
  return { email, password: body.password };
}
