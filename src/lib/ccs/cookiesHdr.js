import { sessionCookieName } from "./auth";

export function attachSessionCookie(res, token, expiresAt) {
  const maxAge = Math.max(60, Math.floor((expiresAt - Date.now()) / 1000));
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearSessionCookie(res) {
  res.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
