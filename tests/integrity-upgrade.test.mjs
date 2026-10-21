import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { ddlFragments } from "../src/lib/ccs/drizzle-bootstrap.js";
import {
  integrityMigration,
  integrityInspection,
} from "../src/lib/ccs/integrityMigration.mjs";
import { integrityRepairMigration } from "../src/lib/ccs/integrityRepairMigration.mjs";
import { workflowMigration } from "../src/lib/ccs/workflowMigration.mjs";

test("upgrade preserves legacy orphans and replies, repairs counts, and is repeatable", async () => {
  const pg = new PGlite();
  try {
    const base = ddlFragments().filter(
      (statement) =>
        !integrityMigration.includes(statement) &&
        !workflowMigration.includes(statement) &&
        !integrityRepairMigration.includes(statement),
    );
    for (const statement of base) await pg.exec(statement);
    await pg.exec(`INSERT INTO ccs_users(id,email,password_salt,password_hash,profile) VALUES('owner','owner@example.com','salt','hash','{}');
      INSERT INTO ccs_posts(id,user_id,content,created_at,comment_count) VALUES('good','owner','Kept',1,999),('orphan','missing','Legacy orphan',1,0);
      INSERT INTO ccs_comments(id,post_id,user_id,body,created_at) VALUES('comment','good','owner','Kept',1),('orphan-comment','missing','missing','Retained orphan',1);
      INSERT INTO ccs_tickets(id,user_id,subject,body,staff_reply,created_at,updated_at) VALUES('ticket','owner','Legacy ticket','Question','Original staff reply',1,2);`);
    const before = (await pg.query(integrityInspection)).rows[0];
    assert.equal(before.orphan_posts, 1);
    for (let pass = 0; pass < 2; pass++)
      await pg.transaction(async (tx) => {
        for (const statement of [
          ...integrityMigration,
          ...workflowMigration,
          ...integrityRepairMigration,
        ])
          await tx.exec(statement);
      });
    assert.equal(
      (await pg.query("SELECT password_hash FROM ccs_users WHERE id='owner'"))
        .rows[0].password_hash,
      "hash",
    );
    assert.equal(
      (await pg.query("SELECT content FROM ccs_posts WHERE id='orphan'"))
        .rows[0].content,
      "Legacy orphan",
    );
    assert.equal(
      Number(
        (await pg.query("SELECT comment_count FROM ccs_posts WHERE id='good'"))
          .rows[0].comment_count,
      ),
      1,
    );
    assert.equal(
      (
        await pg.query(
          "SELECT body FROM ccs_ticket_messages WHERE ticket_id='ticket'",
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await pg.query(
          "SELECT body FROM ccs_ticket_messages WHERE ticket_id='ticket'",
        )
      ).rows[0].body,
      "Original staff reply",
    );
    await assert.rejects(
      pg.query(
        "INSERT INTO ccs_comments(id,post_id,user_id,body,created_at) VALUES('new','missing','owner','Rejected',1)",
      ),
      { code: "23503" },
    );
  } finally {
    await pg.close();
  }
});

test("repair detects and restores version columns despite an existing migration ledger", async () => {
  const pg = new PGlite();
  try {
    for (const statement of ddlFragments().filter(
      (value) => !integrityRepairMigration.includes(value),
    ))
      await pg.exec(statement);
    const tables = [
      ["ccs_users", "ccs_users_version"],
      ["ccs_posts", "ccs_posts_version"],
      ["ccs_site_settings", "ccs_settings_version"],
      ["ccs_announcements", "ccs_announcements_version"],
      ["ccs_tickets", "ccs_tickets_version"],
    ];
    for (const [table, trigger] of tables)
      await pg.exec(
        `DROP TRIGGER ${trigger} ON ${table}; ALTER TABLE ${table} DROP COLUMN version;`,
      );
    assert.equal(
      (
        await pg.query(
          "SELECT version FROM ccs_migrations WHERE version='20261021_integrity_v1'",
        )
      ).rows.length,
      1,
    );
    for (const statement of integrityRepairMigration) await pg.exec(statement);
    assert.equal(
      (
        await pg.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND column_name='version' AND table_name IN ('ccs_users','ccs_posts','ccs_site_settings','ccs_announcements','ccs_tickets')",
        )
      ).rows.length,
      5,
    );
    assert.equal(
      (
        await pg.query(
          "SELECT tgname FROM pg_trigger WHERE tgname IN ('ccs_users_version','ccs_posts_version','ccs_settings_version','ccs_announcements_version','ccs_tickets_version')",
        )
      ).rows.length,
      5,
    );
  } finally {
    await pg.close();
  }
});
