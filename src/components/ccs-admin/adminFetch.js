export async function jsonFetch(url, opts = {}, retried = false) {
  const res = await fetch(url, {
    ...opts, credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 428 && !retried) {
    const verified = await new Promise((resolve) => {
      window.dispatchEvent(new CustomEvent("ccs:reauth", { detail: { resolve } }));
    });
    if (verified) return jsonFetch(url, opts, true);
    throw new Error("Change not saved. Verify your password to continue.");
  }
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  if (url.startsWith("/api/admin/") && !url.startsWith("/api/admin/auth/") && opts.method && opts.method !== "GET") {
    window.dispatchEvent(new CustomEvent("ccs:admin-mutation", { detail: { url } }));
  }
  return data;
}
