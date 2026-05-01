import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { newPasswordRecord, sanitizeEmail } from "./auth";
import { getDb } from "./drizzle-client";
import { publicAppBaseUrl, sendPasswordResetEmail } from "./mailer";
import * as schema from "./schema";

const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Always returns generic success to callers (anti-enumeration).
 * If the user exists, creates a token and attempts email.
 */
export async function requestPasswordResetByEmail(rawEmail) {
  const email = sanitizeEmail(rawEmail);
  if (!email) return { ok: true };

  const db = await getDb();
  const [user] = await db.select().from(schema.ccsUsers).where(eq(schema.ccsUsers.email, email)).limit(1);
  if (!user) return { ok: true };

  await db.delete(schema.ccsPasswordResetTokens).where(eq(schema.ccsPasswordResetTokens.userId, user.id));

  const token = randomBytes(32).toString("hex");
  const id = randomUUID();
  const expiresAt = Date.now() + TOKEN_TTL_MS;

  await db.insert(schema.ccsPasswordResetTokens).values({
    id,
    userId: user.id,
    token,
    expiresAt,
  });

  let base = publicAppBaseUrl() || "";
  if (!base && process.env.VERCEL_URL) base = `https://${process.env.VERCEL_URL}`;
  if (!base && process.env.NODE_ENV !== "production") base = "http://localhost:3000";
  base = base.replace(/\/$/, "");
  const resetUrl = base ? `${base}/?reset=${encodeURIComponent(token)}` : "";

  if (!resetUrl) {
    /* eslint-disable no-console */
    console.warn("[ccs] Set CCS_PUBLIC_URL, NEXT_PUBLIC_APP_URL, or VERCEL_URL so password-reset emails contain a valid link. Token:", token);
    /* eslint-enable no-console */
  }

  const mailed = resetUrl ? await sendPasswordResetEmail({ toEmail: email, resetUrl }) : { via: "skipped", ok: false };

  return { ok: true, mailed };
}

export async function completePasswordReset(tokenRaw, newPassword) {
  const token = String(tokenRaw || "").trim();
  const password = String(newPassword || "");
  if (!token || token.length < 16) return { error: "invalid_token", status: 400 };
  if (password.length < 8) return { error: "weak_password", status: 400, message: "Password should be at least 8 characters." };

  const db = await getDb();
  const now = Date.now();
  const [row] = await db
    .select()
    .from(schema.ccsPasswordResetTokens)
    .where(eq(schema.ccsPasswordResetTokens.token, token))
    .limit(1);

  if (!row || row.expiresAt < now) return { error: "invalid_or_expired_token", status: 400, message: "This reset link is invalid or has expired." };

  const { salt, hash } = newPasswordRecord(password);

  await db
    .update(schema.ccsUsers)
    .set({ passwordSalt: salt, passwordHash: hash })
    .where(eq(schema.ccsUsers.id, row.userId));

  await db.delete(schema.ccsPasswordResetTokens).where(eq(schema.ccsPasswordResetTokens.userId, row.userId));
  await db.delete(schema.ccsSessions).where(eq(schema.ccsSessions.userId, row.userId));

  return { ok: true };
}
