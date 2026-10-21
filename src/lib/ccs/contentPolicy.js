import { RequestError, textField } from "./requestValidation.mjs";
import {
  CCS_POST_BODY_MAX_CHARS,
  CCS_COMMENT_BODY_MAX_CHARS,
} from "./postContentLimits";
import { getDb } from "./drizzle-client";
import { ccsSiteSettings } from "./schema";
import { eq } from "drizzle-orm";

export async function validateContent(value, kind = "post") {
  const content = textField(
    value,
    kind === "post" ? "Post" : "Comment",
    kind === "post" ? CCS_POST_BODY_MAX_CHARS : CCS_COMMENT_BODY_MAX_CHARS,
    { empty: false },
  );
  const db = await getDb();
  const [row] = await db
    .select({ value: ccsSiteSettings.value })
    .from(ccsSiteSettings)
    .where(eq(ccsSiteSettings.key, "site"))
    .limit(1);
  const words = Array.isArray(row?.value?.bannedWords)
    ? row.value.bannedWords
    : [];
  const normalized = content.normalize("NFKC").toLocaleLowerCase();
  if (
    words.some(
      (word) =>
        typeof word === "string" &&
        word.trim() &&
        normalized.includes(word.normalize("NFKC").toLocaleLowerCase()),
    )
  )
    throw new RequestError(
      "This content contains a term restricted by the community policy.",
      422,
    );
  return content;
}
export async function enforceGuestRead(viewerId) {
  if (viewerId) return;
  const db = await getDb();
  const [row] = await db
    .select({ value: ccsSiteSettings.value })
    .from(ccsSiteSettings)
    .where(eq(ccsSiteSettings.key, "site"))
    .limit(1);
  if (row?.value?.guestReadOnly === false)
    throw new RequestError("Sign in to browse this community.", 401);
}
