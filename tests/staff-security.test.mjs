import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { randomBytes } from "node:crypto";
import { TOTP } from "otpauth";
import { encryptSecret, decryptSecret, newMfaSecret, validCounter, newRecoveryCodes, recoveryHash } from "../src/lib/ccs/mfaCrypto.mjs";
import { verifyMfaWithQuery } from "../src/lib/ccs/mfaVerification.mjs";
import { consumeLoginWithQuery, parseLogin, LOGIN_WINDOW_MS } from "../src/lib/ccs/loginPolicy.mjs";
import { staffMigration } from "../src/lib/ccs/staffMigration.mjs";
import { canManageUser, canAccessSection, staffSessionValid, recentlyAuthenticated, STAFF_SESSION_MS, STAFF_IDLE_MS, RECENT_AUTH_MS } from "../src/lib/ccs/staffPolicy.mjs";

test("permission matrix protects staff profiles from moderators and denies nonstaff", () => {
  for (const role of ["student", "moderator", "admin", "unknown"]) {
    const target = { id: "target", role };
    assert.equal(canManageUser({ id: "mod", role: "moderator" }, target), role === "student");
    assert.equal(canManageUser({ id: "admin", role: "admin" }, target), true);
    assert.equal(canManageUser({ id: "student", role: "student" }, target), false);
    assert.equal(canManageUser({ id: "mod", role: "moderator" }, target, "role"), false);
    assert.equal(canManageUser({ id: "mod", role: "moderator" }, target, "delete"), false);
  }
  assert.equal(canManageUser({ id: "a", role: "admin", banned: true }, { id: "b", role: "student" }), false);
  assert.equal(canManageUser({ id: "a", role: "admin" }, { id: "a", role: "admin" }, "ban"), false);
  assert.equal(canAccessSection("moderator", "landing"), false);
  assert.equal(canAccessSection("moderator", "reports"), true);
});

test("staff sessions enforce absolute/idle/recent-auth deadlines and reject legacy sessions", () => {
  const now = 1_900_000_000_000;
  const session = { createdAt: now - 1000, lastSeenAt: now - 1000, authenticatedAt: now - 1000, expiresAt: now + STAFF_SESSION_MS };
  assert.equal(staffSessionValid(session, now), true);
  assert.equal(staffSessionValid({ ...session, createdAt: now - STAFF_SESSION_MS }, now), false);
  assert.equal(staffSessionValid({ ...session, lastSeenAt: now - STAFF_IDLE_MS }, now), false);
  assert.equal(staffSessionValid({ expiresAt: now + STAFF_SESSION_MS }, now), false);
  assert.equal(recentlyAuthenticated(session, now), true);
  assert.equal(recentlyAuthenticated({ ...session, authenticatedAt: now - RECENT_AUTH_MS }, now), false);
});

test("real PostgreSQL migration protects the last active admin, preserves credentials and revokes changed access", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE ccs_users (id text PRIMARY KEY, role text NOT NULL, banned boolean NOT NULL DEFAULT false, password_hash text);
      CREATE TABLE ccs_sessions (token text PRIMARY KEY, user_id text, expires_at bigint);
      INSERT INTO ccs_users VALUES ('owner', 'admin', false, 'unchanged'), ('student', 'student', false, 'also-unchanged'), ('banned-admin', 'admin', true, 'unchanged');`);
    for (let pass = 0; pass < 2; pass++) for (const statement of staffMigration) await db.exec(statement);
    for (const statement of ["UPDATE ccs_users SET role='student' WHERE id='owner'", "UPDATE ccs_users SET banned=true WHERE id='owner'", "DELETE FROM ccs_users WHERE id='owner'"]) {
      await assert.rejects(db.exec(statement), /last active administrator/);
    }
    assert.equal((await db.query("SELECT password_hash FROM ccs_users WHERE id='owner'")).rows[0].password_hash, "unchanged");
    await db.exec("INSERT INTO ccs_sessions(token,user_id,expires_at) VALUES ('s','student',123); UPDATE ccs_users SET role='moderator' WHERE id='student'");
    assert.equal((await db.query("SELECT * FROM ccs_sessions WHERE user_id='student'")).rows.length, 0);
    await db.exec("UPDATE ccs_users SET role='admin' WHERE id='student'; UPDATE ccs_users SET role='moderator' WHERE id='owner'");
    await assert.rejects(db.exec("DELETE FROM ccs_users WHERE id='student'"), /last active administrator/);
    await db.exec("INSERT INTO ccs_sessions(token,user_id,expires_at) VALUES ('owner-session','owner',123); UPDATE ccs_users SET banned=true WHERE id='owner'");
    assert.equal((await db.query("SELECT * FROM ccs_sessions WHERE user_id='owner'")).rows.length, 0);
  } finally { await db.close(); }
});

test("MFA encrypts secrets with account binding and rejects tampering/wrong keys", () => {
  const previous = process.env.CCS_MFA_KEY;
  try {
    process.env.CCS_MFA_KEY = randomBytes(32).toString("hex");
    const secret = newMfaSecret();
    const encrypted = encryptSecret(secret, "owner");
    assert.equal(decryptSecret(encrypted, "owner"), secret);
    assert.ok(!encrypted.includes(secret));
    assert.throws(() => decryptSecret(encrypted, "other-account"));
    process.env.CCS_MFA_KEY = randomBytes(32).toString("hex");
    assert.throws(() => decryptSecret(encrypted, "owner"));
    delete process.env.CCS_MFA_KEY;
    assert.throws(() => encryptSecret(secret, "owner"), /not configured/);
  } finally {
    if (previous === undefined) delete process.env.CCS_MFA_KEY;
    else process.env.CCS_MFA_KEY = previous;
  }
});

test("authenticator accepts the narrow time window and recovery hashes are account-bound", () => {
  const secret = newMfaSecret(), timestamp = 1_900_000_000_000;
  const totp = new TOTP({ secret });
  assert.equal(validCounter(secret, totp.generate({ timestamp }), timestamp), totp.counter({ timestamp }));
  assert.equal(validCounter(secret, totp.generate({ timestamp: timestamp - 120_000 }), timestamp), null);
  assert.equal(validCounter(secret, "invalid", timestamp), null);
  const codes = newRecoveryCodes();
  assert.equal(new Set(codes).size, 8);
  assert.notEqual(recoveryHash(codes[0], "owner"), recoveryHash(codes[0], "other"));
});

test("PostgreSQL enforces one-time MFA/recovery usage and persistent login limits", async () => {
  const previous = process.env.CCS_MFA_KEY;
  const db = new PGlite();
  try {
    process.env.CCS_MFA_KEY = randomBytes(32).toString("hex");
    await db.exec("CREATE TABLE ccs_users(id text PRIMARY KEY,role text,banned boolean); CREATE TABLE ccs_sessions(token text,user_id text); INSERT INTO ccs_users VALUES ('owner','admin',false)");
    for (const statement of staffMigration) await db.exec(statement);
    const secret = newMfaSecret(), code = new TOTP({ secret }).generate();
    const recovery = newRecoveryCodes()[0];
    await db.query("INSERT INTO ccs_staff_mfa(user_id,encrypted_secret,enabled,recovery_hashes) VALUES($1,$2,true,$3::jsonb)", ["owner", encryptSecret(secret, "owner"), JSON.stringify({ [recoveryHash(recovery, "owner")]: true })]);
    const query = (text, params) => db.query(text, params);
    assert.equal(await verifyMfaWithQuery(query, "owner", "bad"), false);
    assert.equal(await verifyMfaWithQuery(query, "owner", code), true);
    assert.equal(await verifyMfaWithQuery(query, "owner", code), false);
    const attempts = await Promise.all([verifyMfaWithQuery(query, "owner", recovery), verifyMfaWithQuery(query, "owner", recovery)]);
    assert.equal(attempts.filter(Boolean).length, 1);
    assert.equal(await verifyMfaWithQuery(query, "missing", "", { allowUnenrolled: false }), false);
    for (let n = 0; n < 10; n++) assert.equal((await consumeLoginWithQuery(query, "owner@example.com", 1_900_000_000_000)).allowed, true);
    const denied = await consumeLoginWithQuery(query, "owner@example.com", 1_900_000_000_000);
    assert.equal(denied.allowed, false);
    assert.equal(denied.retryAfter, 900);
    assert.equal((await consumeLoginWithQuery(query, "owner@example.com", 1_900_000_000_000 + LOGIN_WINDOW_MS)).allowed, true);
  } finally {
    await db.close();
    if (previous === undefined) delete process.env.CCS_MFA_KEY;
    else process.env.CCS_MFA_KEY = previous;
  }
});

test("login parser rejects invalid roots, credential coercion and oversized passwords", () => {
  for (const value of [null, [], 1, {}, { email: {}, password: "pw" }, { email: "a", password: "x".repeat(1025) }]) assert.equal(parseLogin(value), null);
  assert.deepEqual(parseLogin({ email: " Owner@Example.com ", password: " pw " }), { email: "owner@example.com", password: " pw " });
});
