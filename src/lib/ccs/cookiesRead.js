import { cookies } from "next/headers";
import { sessionCookieName } from "./auth";

/** Next 16+: `cookies()` may be backed by async plumbing — always await. */
export async function readSessionTokenFromCookies() {
  try {
    const jar = await cookies();
    const c = jar.get(sessionCookieName());
    return c?.value || "";
  } catch {
    return "";
  }
}
