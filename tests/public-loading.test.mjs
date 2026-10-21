import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

test("profile edits omit server-owned account fields from the public write contract", async () => {
  const bundle = await build({ entryPoints: ["src/components/ccs-talks/api/ccsApi.js"], bundle: true, format: "esm", write: false });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);
  const originalFetch = globalThis.fetch;
  let sent;
  try {
    globalThis.fetch = async (url, options) => {
      sent = { url, method: options.method, body: JSON.parse(options.body) };
      return new Response('{"profile":{"name":"Updated"}}');
    };
    await api.patchProfile({ name: "Updated", bio: "", handle: "existing", id: "u_existing", badges: ["Staff"], forumRole: "admin", university: "Server-controlled", handleChangedAt: 123, publicRoleBadge: "Faculty" });
    assert.deepEqual(sent, { url: "/api/profile", method: "PATCH", body: { name: "Updated", handle: "existing", bio: "" } });
  } finally { globalThis.fetch = originalFetch; }
});

test("public landing shares requests, expires its snapshot, and recovers after failure", async () => {
  const bundle = await build({ entryPoints: ["src/components/ccs-talks/api/ccsApi.js"], bundle: true, format: "esm", write: false });
  const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = originalNow();
  let calls = 0;
  let complete;
  try {
    Date.now = () => now;
    globalThis.fetch = () => { calls++; return new Promise(resolve => { complete = resolve; }); };
    const first = api.getLanding();
    const second = api.getLanding();
    assert.equal(calls, 1, "simultaneous consumers share transport");
    complete(new Response(JSON.stringify({ stats: [123] })));
    assert.deepEqual(await first, await second);
    assert.deepEqual(await api.getLanding(), { stats: [123] });
    assert.equal(calls, 1, "quick navigation reuses public snapshot");
    now += 10_001;
    globalThis.fetch = async () => { calls++; return new Response('{"error":"offline"}', { status: 503 }); };
    await assert.rejects(api.getLanding(), { status: 503 });
    globalThis.fetch = async () => { calls++; return new Response('{"stats":[456]}'); };
    assert.deepEqual(await api.getLanding(), { stats: [456] });
    assert.equal(calls, 3, "failed request neither sticks nor replaces the snapshot");
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});
