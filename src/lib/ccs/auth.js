import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

const SESSION_COOKIE = "ccs_session";
const PEPPER = process.env.CCS_AUTH_PEPPER || "";

/** One-time warning when the pepper is empty in a production *runtime* (not during `next build`). */
if (
  !PEPPER &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  /* eslint-disable no-console */
  console.warn(
    "[ccs-auth] CCS_AUTH_PEPPER is not set in production. " +
      "Per-user salt + scrypt is still applied, but a global pepper is recommended " +
      "to make password recovery from a DB leak harder.",
  );
  /* eslint-enable no-console */
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function hashPassword(password, saltHex) {
  const salt = Buffer.from(saltHex, "hex");
  const hash = crypto.scryptSync(PEPPER + password, salt, 64);
  return hash.toString("hex");
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  try {
    if (typeof saltHex !== "string" || typeof expectedHashHex !== "string") return false;
    if (!saltHex || !expectedHashHex) return false;

    if (typeof password !== "string" || password.length > 1024) return false;
    const a = await scryptAsync(PEPPER + password, Buffer.from(saltHex, "hex"), 64);
    const b = Buffer.from(expectedHashHex, "hex");
    if (a.length === 0 || b.length === 0) return false;
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function newPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return { salt, hash };
}

export function sanitizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
