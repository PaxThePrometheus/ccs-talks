import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { TOTP, Secret } from "otpauth";

function key() {
  const value = process.env.CCS_MFA_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new Error("MFA encryption is not configured");
  return Buffer.from(value, "hex");
}

export function mfaConfigured() {
  return /^[a-f\d]{64}$/i.test(process.env.CCS_MFA_KEY || "");
}

export function encryptSecret(secret, userId) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(userId));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value, userId) {
  const [iv, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function newMfaSecret() { return new Secret({ size: 20 }).base32; }
export function recoveryHash(code, userId) {
  return createHash("sha256").update(`${userId}:${String(code).trim().toLowerCase()}`).digest("hex");
}
export function newRecoveryCodes() { return Array.from({ length: 8 }, () => randomBytes(10).toString("hex")); }

export function validCounter(secret, code, timestamp = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const totp = new TOTP({ secret });
  const delta = totp.validate({ token: code, window: 1, timestamp });
  return delta === null ? null : totp.counter({ timestamp }) + delta;
}
