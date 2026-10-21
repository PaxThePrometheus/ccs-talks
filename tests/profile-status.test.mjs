import test from "node:test";
import assert from "node:assert/strict";
import { statusBadgeDisplayLabels, sanitizePublicRoleBadge } from "../src/lib/ccs/statusBadges.js";

test("faculty titles coexist with staff roles rather than being hidden by them", () => {
  for (const [key, title] of Object.entries({ teacher: "Teacher", instructor: "Instructor", dean: "Dean", professor: "Professor" })) {
    assert.deepEqual(statusBadgeDisplayLabels({ forumRole: "student", publicRoleBadge: key }), [title]);
    assert.deepEqual(statusBadgeDisplayLabels({ forumRole: "admin", publicRoleBadge: key }), ["Administrator", title]);
    assert.deepEqual(statusBadgeDisplayLabels({ forumRole: "moderator", publicRoleBadge: key }), ["Moderator", title]);
  }
});

test("missing/invalid faculty titles do not create a badge or obscure the actual staff role", () => {
  assert.deepEqual(statusBadgeDisplayLabels(null), []);
  assert.deepEqual(statusBadgeDisplayLabels({ forumRole: "admin", publicRoleBadge: null }), ["Administrator"]);
  assert.deepEqual(statusBadgeDisplayLabels({ forumRole: "moderator", publicRoleBadge: "unsupported" }), ["Moderator"]);
  assert.deepEqual(statusBadgeDisplayLabels({ publicRoleBadge: " Professor " }), ["Professor"]);
  assert.equal(sanitizePublicRoleBadge("owner"), null);
});
