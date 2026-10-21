import { randomUUID } from "node:crypto";
import { runDbTransaction } from "./drizzle-client";
import { RequestError, resultRows } from "./requestValidation.mjs";

/** Mutation and required audit entry either both commit or both roll back. */
export async function auditedMutation(
  actorId,
  action,
  targetId,
  statement,
  params = [],
  meta = {},
  revision = null,
  message = null,
  removePostId = null,
  revokeUserId = null,
) {
  const offset = params.length;
  const bind = (n) => `$${offset + n}`;
  const extra = revision
    ? `, retained AS (
    INSERT INTO ccs_content_revisions(id,kind,target_id,actor_id,value,reason,created_at)
    SELECT ${bind(7)},${bind(8)},${bind(4)},${bind(2)},${bind(9)}::jsonb,${bind(10)},${bind(6)} FROM changed RETURNING id)`
    : message
      ? `, message_saved AS (
    INSERT INTO ccs_ticket_messages(id,ticket_id,author_id,body,created_at,request_id)
    SELECT ${bind(7)},${bind(4)},${bind(2)},${bind(8)},${bind(6)},${bind(9)} FROM changed
    ON CONFLICT(ticket_id,request_id) DO NOTHING RETURNING id)`
      : removePostId
        ? `, removed_post AS (DELETE FROM ccs_posts WHERE id=${bind(7)} AND EXISTS(SELECT 1 FROM changed) RETURNING id)`
        : revokeUserId
          ? `, revoked AS (DELETE FROM ccs_sessions WHERE user_id=${bind(7)} AND EXISTS(SELECT 1 FROM changed) RETURNING token)`
          : "";
  const prep = [["SELECT set_config('ccs.actor_id',$1,true)", [actorId]]];
  if (
    ["user_set_role", "user_ban", "user_unban", "user_delete"].includes(action)
  )
    prep.push(["LOCK TABLE ccs_users IN SHARE ROW EXCLUSIVE MODE"]);
  const results = await runDbTransaction([
    ...prep,
    [
      `WITH changed AS (${statement} RETURNING *), logged AS (
    INSERT INTO ccs_audit_log(id,actor_id,action,target_id,meta,created_at)
    SELECT ${bind(1)},${bind(2)},${bind(3)},${bind(4)},${bind(5)}::jsonb,${bind(6)} FROM changed
    RETURNING id
  ) ${extra} SELECT changed.* FROM changed CROSS JOIN logged`,
      [
        ...params,
        `a_${randomUUID()}`,
        actorId,
        action,
        targetId,
        JSON.stringify(meta),
        Date.now(),
        ...(revision
          ? [
              `rev_${randomUUID()}`,
              revision.kind,
              JSON.stringify(revision.value),
              revision.reason || "",
            ]
          : message
            ? [`msg_${randomUUID()}`, message.body, message.requestId]
            : removePostId
              ? [removePostId]
              : revokeUserId
                ? [revokeUserId]
                : []),
      ],
    ],
  ]);
  const rows = resultRows(results.at(-1));
  if (!rows.length)
    throw new RequestError(
      "This record changed or was removed. Reload it before saving again.",
      409,
    );
  return rows[0];
}
