import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { TOTP } from "otpauth";
import { encryptSecret, newMfaSecret } from "../src/lib/ccs/mfaCrypto.mjs";

test("actual staff services enforce role boundaries, session rules and MFA on a disposable database", async () => {
  const fixture = new URL(
    `./staff-fixture-${randomUUID()}.mjs`,
    import.meta.url,
  );
  const pg = new PGlite();
  await pg.exec("SELECT 1");
  const previousKey = process.env.CCS_MFA_KEY;
  try {
    // Bundle the application alias imports, replacing only the database transport.
    // Authentication, policy, SQL, schema and service functions are the real code.
    await build({
      stdin: {
        contents:
          'export * from "./src/lib/ccs/admin.js"; export * from "./src/lib/ccs/store.js"; export * from "./src/lib/ccs/schema.js"; export * from "./src/lib/ccs/drizzle-bootstrap.js"; export * from "./src/lib/ccs/adminListPage.js"; export {PATCH as userPatch} from "./src/app/api/admin/users/[userId]/route.js"; export {PATCH as postPatch} from "./src/app/api/admin/posts/[postId]/route.js";',
        resolveDir: process.cwd(),
      },
      outfile: fileURLToPath(fixture),
      platform: "node",
      format: "esm",
      bundle: true,
      packages: "external",
      plugins: [
        {
          name: "disposable-db",
          setup(builder) {
            builder.onResolve({ filter: /^next\/server$/ }, () => ({
              path: new URL("../node_modules/next/server.js", import.meta.url)
                .href,
              external: true,
            }));
            builder.onLoad({ filter: /cookiesRead\.js$/ }, () => ({
              contents:
                "export async function readSessionTokenFromCookies(){return globalThis.__staffToken;}",
              loader: "js",
            }));
            builder.onLoad({ filter: /drizzle-client\.js$/ }, () => ({
              contents: `
          export async function ensureReady() {}
          export async function getDb() { return globalThis.__staffDb; }
          export async function queryDb(text, params = []) { return globalThis.__staffPg.query(text, params); }
          export async function runDbTransaction(statements) { return globalThis.__staffPg.transaction(async tx => {
            const results = []; for (const [text, params = []] of statements) results.push(await tx.query(text, params)); return results;
          }); }
        `,
              loader: "js",
            }));
          },
        },
      ],
    });
    const service = await import(fixture.href);
    await pg.transaction(async (tx) => {
      for (const ddl of service.ddlFragments()) await tx.exec(ddl);
    });
    globalThis.__staffPg = pg;
    const issuedQueries = [];
    globalThis.__staffDb = drizzle(pg, {
      logger: {
        logQuery(query) {
          issuedQueries.push(query);
        },
      },
    });
    const student = await service.registerAccountRow(
      "student@example.com",
      "student-password",
      "Student",
    );
    const owner = await service.registerAccountRow(
      "owner@example.com",
      "owner-password",
      "Owner",
    );
    const mod = await service.registerAccountRow(
      "mod@example.com",
      "moderator-password",
      "Moderator",
    );
    await pg.query("UPDATE ccs_users SET role='admin' WHERE id=$1", [
      owner.profile.id,
    ]);
    await pg.query("UPDATE ccs_users SET role='moderator' WHERE id=$1", [
      mod.profile.id,
    ]);
    assert.equal(
      await service.resolveViewerFromSession(owner.token),
      null,
      "promotion revokes old student session",
    );
    assert.equal(
      (
        await service.loginAccountRow(
          "student@example.com",
          "student-password",
          { staffOnly: true },
        )
      ).fail,
      true,
    );
    const ownerLogin = await service.loginAccountRow(
      "owner@example.com",
      "owner-password",
      { staffOnly: true },
    );
    const modLogin = await service.loginAccountRow(
      "mod@example.com",
      "moderator-password",
      { staffOnly: true },
    );
    issuedQueries.length = 0;
    const ownerGate = await service.requireStaff(ownerLogin.token, {
      recentAuth: true,
    });
    assert.equal(
      issuedQueries.length,
      1,
      "staff gate resolves session and current user in one query",
    );
    issuedQueries.length = 0;
    const overview = await service.getOverview();
    assert.equal(
      issuedQueries.length,
      4,
      "cold overview uses bounded aggregate queries",
    );
    assert.ok(
      !issuedQueries.some((q) =>
        /select "id", "email", "password_hash"/.test(q),
      ),
      "analytics never loads account secrets",
    );
    issuedQueries.length = 0;
    await service.getOverview();
    assert.equal(
      issuedQueries.length,
      2,
      "warm overview reuses diagnostic sample",
    );
    assert.equal(overview.totals.users, 3);
    issuedQueries.length = 0;
    assert.equal((await service.getPublicLandingBundle()).counts.members, 3);
    assert.equal(
      issuedQueries.length,
      1,
      "public landing reads CMS, settings and aggregate statistics in one query",
    );
    await assert.rejects(
      service.patchUserProfileAsStaff(ownerGate.row, student.profile.id, {
        avatarColor: "x".repeat(37),
      }),
      { status: 413 },
    );
    globalThis.__staffToken = ownerLogin.token;
    for (const payload of [
      null,
      [],
      "text",
      {},
      { role: "admin", banned: true },
      { unsupported: true },
      { expectedVersion: 0 },
    ]) {
      const response = await service.userPatch(
        new Request("http://localhost/api/admin/users/target", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        { params: Promise.resolve({ userId: student.profile.id }) },
      );
      assert.equal(
        response.status,
        400,
        `invalid account payload ${JSON.stringify(payload)}`,
      );
    }
    const emptyPostPatch = await service.postPatch(
      new Request("http://localhost/api/admin/posts/target", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
      { params: Promise.resolve({ postId: "missing" }) },
    );
    assert.equal(emptyPostPatch.status, 400);
    // Integrity and policy regression paths exercise the real application SQL.
    const disposable = await service.registerAccountRow(
      "disposable@example.com",
      "disposable-password",
      "Disposable",
    );
    const post = await service.createUserPost(
      disposable.profile.id,
      "A reportable thread",
      "General",
    );
    await service.addCommentEnvelope(
      post.id,
      owner.profile.id,
      "A reply from another member",
    );
    await service.createUserReport(owner.profile.id, post.id, "Needs review");
    assert.equal(
      Number(
        (
          await pg.query("SELECT comment_count FROM ccs_posts WHERE id=$1", [
            post.id,
          ])
        ).rows[0].comment_count,
      ),
      1,
    );
    await pg.exec(`CREATE FUNCTION test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='post_delete' THEN RAISE EXCEPTION 'Injected audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER test_audit_failure BEFORE INSERT ON ccs_audit_log FOR EACH ROW EXECUTE FUNCTION test_audit_failure();`);
    await assert.rejects(service.adminDeletePost(ownerGate.row, post.id));
    assert.equal(
      (
        await pg.query("SELECT COUNT(*) FROM ccs_comments WHERE post_id=$1", [
          post.id,
        ])
      ).rows[0].count,
      1,
      "audit failure rolls back comment cascade",
    );
    assert.equal(
      (
        await pg.query("SELECT status FROM ccs_reports WHERE post_id=$1", [
          post.id,
        ])
      ).rows[0].status,
      "open",
      "audit failure rolls back report resolution",
    );
    await pg.exec(
      "DROP TRIGGER test_audit_failure ON ccs_audit_log; DROP FUNCTION test_audit_failure();",
    );
    await service.deleteUserCascade(ownerGate.row, disposable.profile.id);
    assert.equal(
      (
        await pg.query("SELECT COUNT(*) FROM ccs_comments WHERE post_id=$1", [
          post.id,
        ])
      ).rows[0].count,
      0,
      "deleting author removes other members' comments on their posts",
    );
    const retained = (
      await pg.query("SELECT * FROM ccs_reports WHERE post_id=$1", [post.id])
    ).rows[0];
    assert.equal(retained.status, "resolved");
    assert.equal(retained.snapshot.post.content, "A reportable thread");
    const settings = await service.setSiteSettings(ownerGate.row.id, {
      bannedWords: ["restricted term"],
      badgeRegistry: [
        { id: "badge-1", label: "Helpful member", color: "#81243f" },
      ],
    });
    await service.setSiteSettings(ownerGate.row.id, {
      registrationOpen: true,
      badgeRegistry: settings.badgeRegistry,
      expectedVersion: settings.version,
    });
    await assert.rejects(
      service.setSiteSettings(ownerGate.row.id, {
        guestReadOnly: false,
        expectedVersion: settings.version,
      }),
      { status: 409 },
    );
    await assert.rejects(
      service.createUserPost(
        owner.profile.id,
        "Contains restricted term",
        "General",
      ),
      { status: 422 },
    );
    assert.equal(
      (await service.adminEditPost(ownerGate.row, "missing", "Hello")).status,
      404,
    );
    assert.equal(
      (await service.adminPinPost(ownerGate.row, "missing", true)).status,
      404,
    );
    await assert.rejects(
      service.saveLandingCms(ownerGate.row.id, {
        cms: { featureCards: [null] },
      }),
      { status: 400 },
    );
    const landing = await service.saveLandingCms(ownerGate.row.id, {
      cms: { featureCards: [], communityOrgs: [] },
    });
    assert.deepEqual(landing.cms.featureCards, []);
    assert.deepEqual(landing.cms.communityOrgs, []);
    await service.setSiteSettings(ownerGate.row.id, {
      bannedWords: [],
      guestReadOnly: false,
    });
    await assert.rejects(service.fetchPublicFeed(null), { status: 401 });
    await service.setSiteSettings(ownerGate.row.id, { guestReadOnly: true });
    const reviewPost = await service.createUserPost(
      owner.profile.id,
      "Reviewed source content",
      "General",
    );
    await service.createUserReport(
      student.profile.id,
      reviewPost.id,
      "Review this post",
    );
    const reportId = (
      await pg.query("SELECT id FROM ccs_reports WHERE post_id=$1", [
        reviewPost.id,
      ])
    ).rows[0].id;
    await service.staffResolveForumReport(
      ownerGate.row,
      reportId,
      "resolved",
      "Confirmed policy violation",
      true,
    );
    assert.equal(
      (await pg.query("SELECT id FROM ccs_posts WHERE id=$1", [reviewPost.id]))
        .rows.length,
      0,
    );
    const reviewed = (
      await pg.query("SELECT * FROM ccs_reports WHERE id=$1", [reportId])
    ).rows[0];
    assert.equal(reviewed.snapshot.post.content, "Reviewed source content");
    assert.equal(reviewed.resolution_note, "Confirmed policy violation");
    assert.equal(reviewed.resolved_by_user_id, owner.profile.id);
    assert.equal(
      (
        await service.staffResolveForumReport(
          ownerGate.row,
          reportId,
          "dismissed",
        )
      ).status,
      409,
    );
    const commentPost = await service.createUserPost(
      owner.profile.id,
      "Thread for comment moderation",
      "General",
    );
    const commentAdded = await service.addCommentEnvelope(
      commentPost.id,
      student.profile.id,
      "A removable comment",
    );
    await service.removeCommentAsStaff(
      ownerGate.row,
      commentPost.id,
      commentAdded.comment.id,
      "Confirmed rule violation",
    );
    assert.equal(
      (
        await pg.query("SELECT COUNT(*) FROM ccs_comments WHERE post_id=$1", [
          commentPost.id,
        ])
      ).rows[0].count,
      0,
    );
    assert.equal(
      Number(
        (
          await pg.query("SELECT comment_count FROM ccs_posts WHERE id=$1", [
            commentPost.id,
          ])
        ).rows[0].comment_count,
      ),
      0,
    );
    assert.equal(
      (
        await pg.query(
          "SELECT value FROM ccs_content_revisions WHERE kind='comment' AND target_id=$1",
          [commentAdded.comment.id],
        )
      ).rows[0].value.body,
      "A removable comment",
    );
    const announcement = (
      await service.createAnnouncementAdmin(ownerGate.row, {
        title: "Original",
        body: "Body",
        pinned: false,
      })
    ).announcement;
    const revised = (
      await service.patchAnnouncementAdmin(ownerGate.row, announcement.id, {
        title: "Corrected",
        pinned: true,
        expectedVersion: announcement.version,
      })
    ).announcement;
    assert.equal(revised.title, "Corrected");
    assert.equal(revised.pinned, true);
    await assert.rejects(
      service.patchAnnouncementAdmin(ownerGate.row, announcement.id, {
        title: "Stale",
        expectedVersion: announcement.version,
      }),
      { status: 409 },
    );
    const ticket = (
      await service.createTicketForUser(owner.profile.id, {
        subject: "Support",
        body: "Question",
      })
    ).ticket;
    const firstReply = (
      await service.updateTicketStaff(ownerGate.row, ticket.id, {
        message: "First response",
        requestId: "first",
        status: "in_progress",
        expectedVersion: 0,
      })
    ).ticket;
    assert.equal(firstReply.messages.length, 1);
    const retry = (
      await service.updateTicketStaff(ownerGate.row, ticket.id, {
        message: "First response",
        requestId: "first",
        status: "in_progress",
        expectedVersion: 0,
      })
    ).ticket;
    assert.equal(
      retry.messages.length,
      1,
      "same request does not append twice",
    );
    const secondReply = (
      await service.updateTicketStaff(ownerGate.row, ticket.id, {
        message: "Second response",
        requestId: "second",
        status: "closed",
        expectedVersion: firstReply.version,
      })
    ).ticket;
    assert.equal(
      secondReply.messages.length,
      2,
      "replies retain append-only history",
    );
    assert.equal(
      (await service.listTicketsForUser(owner.profile.id))[0].messages.length,
      2,
      "owner sees complete conversation",
    );
    await service.saveLandingCms(ownerGate.row.id, {
      cms: { brandName: "Revision one" },
    });
    await service.saveLandingCms(ownerGate.row.id, {
      cms: { brandName: "Revision two" },
    });
    const revisions = await service.landingRevisions();
    await service.restoreLandingCms(
      ownerGate.row.id,
      revisions[0].id,
      (await service.getPublicLandingBundle()).version,
    );
    assert.equal(
      (await service.getLandingCmsMerged()).brandName,
      "Revision one",
    );
    const firstPage = await service.adminListPage(
      "users",
      new URLSearchParams({ limit: "1" }),
    );
    const secondPage = await service.adminListPage(
      "users",
      new URLSearchParams({ limit: "1", cursor: firstPage.nextCursor }),
    );
    assert.notEqual(firstPage.users[0].id, secondPage.users[0].id);
    assert.equal("passwordHash" in firstPage.users[0], false);
    const named = await service.adminListPage(
      "users",
      new URLSearchParams({ q: "Student" }),
    );
    assert.ok(
      named.users.some((user) => user.id === student.profile.id),
      "server search includes profile name",
    );
    const modGate = await service.requireStaff(modLogin.token);
    assert.equal(ownerGate.row.role, "admin");
    assert.equal((await service.requireStaff(student.token)).status, 403);
    assert.equal(
      (await service.requireStaff(modLogin.token, { adminOnly: true })).status,
      403,
    );
    for (const operation of [
      () => service.setUserBadges(modGate.row, owner.profile.id, ["Forged"]),
      () => service.setUserStatus(modGate.row, owner.profile.id, "Forged"),
      () =>
        service.patchUserProfileAsStaff(modGate.row, owner.profile.id, {
          name: "Forged",
        }),
      () => service.setUserBanned(modGate.row, owner.profile.id, true),
    ])
      assert.equal((await operation()).status, 403);
    assert.ok(
      (await service.setUserStatus(modGate.row, student.profile.id, "Reviewed"))
        .user,
    );
    await service.setUserBanned(
      ownerGate.row,
      student.profile.id,
      true,
      "Test ban",
    );
    assert.equal(await service.resolveViewerFromSession(student.token), null);
    // Even a session introduced after ban cannot bypass user-state validation.
    await pg.query(
      "INSERT INTO ccs_sessions(token,user_id,expires_at) VALUES ('race-token',$1,$2)",
      [student.profile.id, Date.now() + 60_000],
    );
    assert.equal(await service.resolveViewerFromSession("race-token"), null);
    await pg.query(
      "UPDATE ccs_sessions SET authenticated_at=1 WHERE token=$1",
      [ownerLogin.token],
    );
    assert.equal(
      (await service.requireStaff(ownerLogin.token, { recentAuth: true }))
        .status,
      428,
    );
    await pg.query("UPDATE ccs_sessions SET last_seen_at=1 WHERE token=$1", [
      modLogin.token,
    ]);
    assert.equal((await service.requireStaff(modLogin.token)).status, 401);
    await pg.query("UPDATE ccs_sessions SET expires_at=1 WHERE token=$1", [
      ownerLogin.token,
    ]);
    assert.equal(
      await service.resolveViewerFromSession(ownerLogin.token),
      null,
      "expiry is enforced independently of background cleanup",
    );
    process.env.CCS_MFA_KEY = "12".repeat(32);
    const secret = newMfaSecret();
    await pg.query(
      "INSERT INTO ccs_staff_mfa(user_id,encrypted_secret,enabled) VALUES($1,$2,true)",
      [owner.profile.id, encryptSecret(secret, owner.profile.id)],
    );
    assert.equal(
      (await service.loginAccountRow("owner@example.com", "owner-password"))
        .fail,
      true,
      "public login must not bypass staff MFA",
    );
    const mfaLogin = await service.loginAccountRow(
      "owner@example.com",
      "owner-password",
      { staffOnly: true, code: new TOTP({ secret }).generate() },
    );
    assert.ok(mfaLogin.token);
    assert.equal(
      (
        await pg.query("SELECT role FROM ccs_users WHERE id=$1", [
          owner.profile.id,
        ])
      ).rows[0].role,
      "admin",
    );
  } finally {
    delete globalThis.__staffDb;
    delete globalThis.__staffPg;
    delete globalThis.__staffToken;
    if (previousKey === undefined) delete process.env.CCS_MFA_KEY;
    else process.env.CCS_MFA_KEY = previousKey;
    await pg.close();
    await unlink(fixture).catch(() => {});
  }
});
