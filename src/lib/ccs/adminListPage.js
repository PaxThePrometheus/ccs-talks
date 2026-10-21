import { queryDb } from "./drizzle-client";
import { RequestError, resultRows } from "./requestValidation.mjs";

const sources = {
  users: {
    table: "ccs_users",
    time: "COALESCE(created_at,0)",
    key: "users",
    fields:
      "id,email,role,banned,banned_reason,banned_at,created_at,profile,version",
  },
  posts: {
    table: "ccs_posts",
    time: "created_at",
    key: "posts",
    fields:
      "*,(SELECT profile->>'name' FROM ccs_users WHERE ccs_users.id=ccs_posts.user_id) AS author_name",
  },
  reports: {
    table: "ccs_reports",
    time: "created_at",
    key: "reports",
    fields: "*",
  },
  tickets: {
    table: "ccs_tickets",
    time: "updated_at",
    key: "tickets",
    fields: "*",
  },
  announcements: {
    table: "ccs_announcements",
    time: "created_at",
    key: "announcements",
    fields: "*",
  },
  audit: {
    table: "ccs_audit_log",
    time: "created_at",
    key: "entries",
    fields:
      "*,(SELECT profile->>'name' FROM ccs_users WHERE ccs_users.id=ccs_audit_log.actor_id) AS actor_name",
  },
};
const camel = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      value,
    ]),
  );
export async function adminListPage(section, params) {
  const source = sources[section];
  if (!source) throw new RequestError("Invalid section.");
  const limit = Number(params.get("limit") || 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new RequestError("Limit must be between 1 and 100.");
  const values = [],
    where = [];
  const bind = (value) => {
    values.push(value);
    return `$${values.length}`;
  };
  const q = params.get("q")?.trim() || "";
  if (q.length > 120) throw new RequestError("Search is too long.");
  const cursor = params.get("cursor");
  if (cursor) {
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(cursor, "base64url").toString());
    } catch {
      throw new RequestError("Invalid cursor.");
    }
    if (
      !Number.isSafeInteger(decoded.at) ||
      typeof decoded.id !== "string" ||
      decoded.id.length > 100
    )
      throw new RequestError("Invalid cursor.");
    where.push(`(${source.time},id)<(${bind(decoded.at)},${bind(decoded.id)})`);
  }
  if (params.get("id")) where.push(`id=${bind(params.get("id"))}`);
  if (q) {
    const column =
      section === "users"
        ? "concat_ws(' ',id,email,profile->>'name',profile->>'handle')"
        : section === "posts"
          ? "content"
          : section === "reports"
            ? "reason"
            : section === "tickets"
              ? "concat_ws(' ',subject,body)"
              : section === "announcements"
                ? "concat_ws(' ',title,body)"
                : "concat_ws(' ',actor_id,action,target_id)";
    where.push(`${column} ILIKE ${bind("%" + q + "%")}`);
  }
  if (section === "users") {
    if (params.get("role")) {
      if (!["admin", "moderator", "student"].includes(params.get("role")))
        throw new RequestError("Invalid role.");
      where.push(`role=${bind(params.get("role"))}`);
    }
    if (params.get("banned")) {
      if (!["true", "false"].includes(params.get("banned")))
        throw new RequestError("Invalid ban filter.");
      where.push(`banned=${bind(params.get("banned") === "true")}`);
    }
  }
  if (["reports", "tickets"].includes(section)) {
    const status =
      params.get("status") ||
      (section === "reports" && !params.get("id") ? "open" : "");
    if (status && status !== "all") {
      if (
        !(
          section === "reports"
            ? ["open", "resolved", "dismissed"]
            : ["open", "in_progress", "closed"]
        ).includes(status)
      )
        throw new RequestError("Invalid status.");
      where.push(`status=${bind(status)}`);
    }
  }
  if (section === "audit")
    for (const [key, column] of [
      ["actor", "actor_id"],
      ["action", "action"],
    ])
      if (params.get(key)) where.push(`${column}=${bind(params.get(key))}`);
  if (section === "audit")
    for (const [key, operator] of [
      ["from", ">="],
      ["to", "<="],
    ])
      if (params.get(key)) {
        const at = Date.parse(
          params.get(key) +
            (key === "to" ? "T23:59:59.999Z" : "T00:00:00.000Z"),
        );
        if (!Number.isFinite(at)) throw new RequestError("Invalid audit date.");
        where.push(`created_at${operator}${bind(at)}`);
      }
  const rows = resultRows(
    await queryDb(
      `SELECT ${source.fields},${source.time} AS cursor_at FROM ${source.table} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${source.time} DESC,id DESC LIMIT ${bind(limit + 1)}`,
      values,
    ),
  );
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const records = page.map((row) => {
    const item = camel(row);
    delete item.cursorAt;
    for (const key of [
      "createdAt",
      "updatedAt",
      "bannedAt",
      "resolvedAt",
      "version",
      "commentCount",
    ])
      if (item[key] != null) item[key] = Number(item[key]);
    return item;
  });
  if (section === "tickets" && records.length) {
    const messages = resultRows(
      await queryDb(
        `SELECT id,ticket_id,author_id,body,created_at FROM ccs_ticket_messages WHERE ticket_id=ANY($1::text[]) ORDER BY created_at,id`,
        [records.map((row) => row.id)],
      ),
    );
    for (const record of records)
      record.messages = messages
        .filter((message) => message.ticket_id === record.id)
        .map(camel);
  }
  return {
    [source.key]: records,
    nextCursor: more
      ? Buffer.from(
          JSON.stringify({ at: Number(last.cursor_at), id: last.id }),
        ).toString("base64url")
      : null,
  };
}
