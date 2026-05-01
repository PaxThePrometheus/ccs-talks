import crypto from "node:crypto";

const SESSION_COOKIE = "ccs_session";
const PEPPER = process.env.CCS_AUTH_PEPPER || "";

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function hashPassword(password, saltHex) {
  const salt = Buffer.from(saltHex, "hex");
  const hash = crypto.scryptSync(PEPPER + password, salt, 64);
  return hash.toString("hex");
}

export function verifyPassword(password, saltHex, expectedHashHex) {
  try {
    const attempt = hashPassword(password, saltHex);
    const a = Buffer.from(attempt, "hex");
    const b = Buffer.from(expectedHashHex, "hex");
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
