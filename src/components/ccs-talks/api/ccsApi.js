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

export function registerAccount({ email, password, name }) {
  return jsonFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) });
}

export function loginAccount({ email, password }) {
  return jsonFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function logoutAccount() {
  return jsonFetch("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
}

export function createPost({ content, tag }) {
  return jsonFetch("/api/posts", { method: "POST", body: JSON.stringify({ content, tag }) });
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

export function getComments(postId) {
  return jsonFetch(`/api/posts/${encodeURIComponent(postId)}/comments`, { method: "GET" });
}

export function postComment(postId, text) {
  return jsonFetch(`/api/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", body: JSON.stringify({ text }) });
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
