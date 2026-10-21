import { queryDb } from "./drizzle-client";
import { verifyMfaWithQuery } from "./mfaVerification.mjs";

export { resultRows } from "./mfaVerification.mjs";

export async function verifyMfa(userId, code, options) {
  return verifyMfaWithQuery(queryDb, userId, code, options);
}
