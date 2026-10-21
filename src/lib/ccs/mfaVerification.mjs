import { decryptSecret, recoveryHash, validCounter } from "./mfaCrypto.mjs";

export function resultRows(result) { return Array.isArray(result) ? result : result.rows; }

export async function verifyMfaWithQuery(query, userId, rawCode, { allowUnenrolled = true } = {}) {
  const [row] = resultRows(await query("SELECT * FROM ccs_staff_mfa WHERE user_id = $1 AND enabled", [userId]));
  if (!row) return allowUnenrolled;
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!code || code.length > 64) return false;
  const counter = validCounter(decryptSecret(row.encrypted_secret, userId), code);
  if (counter !== null) {
    return resultRows(await query("UPDATE ccs_staff_mfa SET last_counter = $1 WHERE user_id = $2 AND enabled AND last_counter < $1 RETURNING user_id", [counter, userId])).length === 1;
  }
  const hash = recoveryHash(code, userId);
  return resultRows(await query("UPDATE ccs_staff_mfa SET recovery_hashes = recovery_hashes - $1::text WHERE user_id = $2 AND enabled AND recovery_hashes ? $1::text RETURNING user_id", [hash, userId])).length === 1;
}
