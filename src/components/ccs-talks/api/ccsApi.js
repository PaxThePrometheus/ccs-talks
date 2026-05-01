async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : text || `Request failed (${res.status})`;
    const err = new Error(msg || "request_failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function getProfileFieldOptions() {
  return jsonFetch("/api/profile-field-options", { method: "GET" });
}

export function getAnnouncements() {
  return jsonFetch("/api/announcements", { method: "GET" });
}

export function getMyTickets() {
  return jsonFetch("/api/tickets", { method: "GET" });
}

export function createTicket(payload) {
  return jsonFetch("/api/tickets", { method: "POST", body: JSON.stringify(payload ?? {}) });
}

export function getVisitProfile(userId) {
  const id = String(userId || "").trim();
  if (!id) return Promise.reject(new Error("Missing user id."));
  return jsonFetch(`/api/profile?visitUserId=${encodeURIComponent(id)}`, { method: "GET" });
}

/** Public profile bundle by @handle (deep links `/profile/handle` + legacy `#profile@handle`). */
export function getVisitProfileByHandle(handle) {
  const h = String(handle || "").trim();
  if (!h) return Promise.reject(new Error("Missing handle."));
  return jsonFetch(`/api/profile?visitHandle=${encodeURIComponent(h)}`, { method: "GET" });
}

export function getPosts(query = {}) {
  const qs = new URLSearchParams();
  if (query.tag) qs.set("tag", query.tag);
  const tail = qs.toString();
  return jsonFetch(`/api/posts${tail ? `?${tail}` : ""}`, { method: "GET" });
}

export function getMe() {
  return jsonFetch("/api/auth/me", { method: "GET" });
}

/** Public landing CMS + live stats (guests OK). */
export function getLanding() {
  return fetch("/api/landing", { cache: "no-store" }).then(async (res) => {
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      const err = new Error(data?.error || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  });
}

export function registerAccount({ email, password, name, handle }) {
  return jsonFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name, handle }) });
}

export function checkHandleAvailable(h) {
  const qs = new URLSearchParams();
  qs.set("h", h || "");
  return jsonFetch(`/api/auth/handle-check?${qs.toString()}`, { method: "GET" });
}

export function loginAccount({ email, password }) {
  return jsonFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function logoutAccount() {
  return jsonFetch("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
}

export async function requestPasswordReset(email) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: String(email || "").trim().toLowerCase() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(typeof data.error === "string" ? data.error : "Could not submit reset request");
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function resetPasswordWithToken(token, password) {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: String(token || "").trim(),
      password: String(password || ""),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(typeof data.error === "string" ? data.error : "Could not reset password");
    err.status = res.status;
    throw err;
  }
  return data;
}

export function createPost({ content, tag, imageUrl }) {
  return jsonFetch("/api/posts", { method: "POST", body: JSON.stringify({ content, tag, imageUrl: imageUrl || "" }) });
}

export function patchPost(postId, content) {
  return jsonFetch(`/api/posts/${encodeURIComponent(postId)}`, { method: "PATCH", body: JSON.stringify({ content }) });
}

export function togglePostLike(postId) {
  return jsonFetch(`/api/posts/${encodeURIComponent(postId)}/like`, { method: "POST", body: JSON.stringify({}) });
}

export function togglePostBookmark(postId) {
  return jsonFetch(`/api/posts/${encodeURIComponent(postId)}/bookmark`, { method: "POST", body: JSON.stringify({}) });
}

export function getPost(postId) {
  return jsonFetch(`/api/posts/${encodeURIComponent(postId)}`, { method: "GET" });
}

export function getComments(postId) {
  return jsonFetch(`/api/posts/${encodeURIComponent(postId)}/comments`, { method: "GET" });
}

export function postComment(postId, text, imageUrl, parentId) {
  const body = { text, imageUrl: imageUrl || "" };
  if (parentId && String(parentId).trim()) body.parentId = String(parentId).trim();
  return jsonFetch(`/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchProfile(patch) {
  return jsonFetch("/api/profile", { method: "PATCH", body: JSON.stringify(patch) });
}

/** Persist prefs · friends · subs · activities (and optional nested profile merges via same route). */
export function patchAccount(payload) {
  return jsonFetch("/api/account", { method: "PATCH", body: JSON.stringify(payload ?? {}) });
}

export function postPresence() {
  return jsonFetch("/api/presence", { method: "POST", body: JSON.stringify({}) });
}

export function getPresence(ids) {
  const qs = new URLSearchParams();
  if (ids?.length) qs.set("ids", ids.join(","));
  return jsonFetch(`/api/presence?${qs.toString()}`, { method: "GET" });
}
