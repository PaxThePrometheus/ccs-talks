import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

// Execute the actual route module, without Next's alias loader. Keeping these
// endpoints independent of DB/auth modules is a deliberate fail-closed boundary.
async function route(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}
const registration = await route("../src/app/api/admin/auth/register/route.js");
const bootstrap = await route("../src/app/api/admin/bootstrap/route.js");

for (const payload of [
  { email: "existing@example.com", password: "arbitrary-password", name: "Attacker" },
  { email: "new@example.com", password: "arbitrary-password", name: "First admin" },
  { email: "banned@example.com", password: "arbitrary-password", inviteCode: "legacy-shared-code" },
  null, [], "not an object",
]) {
  test(`registration rejects ${JSON.stringify(payload)} without setting a session`, async () => {
    const response = await registration.POST(new Request("https://example.com/api/admin/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.match((await response.json()).error, /self-registration is disabled/);
  });
}

test("registration does not inspect body, session or legacy invite configuration", async () => {
  const response = await registration.POST(new Proxy({}, {
    get() { throw new Error("Public enrollment must not read request credentials"); },
  }));
  assert.equal(response.status, 403);
});

test("simultaneous anonymous setup attempts are all denied", async () => {
  const responses = await Promise.all(Array.from({ length: 20 }, () => registration.POST()));
  assert.ok(responses.every((response) => response.status === 403 && !response.headers.has("set-cookie")));
});

test("bootstrap discloses only disabled capabilities and is not cached", async () => {
  const response = await bootstrap.GET();
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { bootstrap: false, inviteRequired: false, registrationOpen: false });
});

test("owner provisioning requires email and explicit confirmation before DB access", () => {
  for (const args of [[], ["owner@example.com"], ["invalid", "--confirm"], ["owner@example.com", "--confirm", "unexpected"]]) {
    const result = spawnSync(process.execPath, ["scripts/provision-first-admin.mjs", ...args], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage:/);
  }
});
