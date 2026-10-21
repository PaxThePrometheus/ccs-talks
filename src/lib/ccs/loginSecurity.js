import { queryDb } from "./drizzle-client";
import { consumeLoginWithQuery } from "./loginPolicy.mjs";

export { parseLogin } from "./loginPolicy.mjs";

export async function consumeLoginAttempt(email) {
  return consumeLoginWithQuery(queryDb, email);
}
