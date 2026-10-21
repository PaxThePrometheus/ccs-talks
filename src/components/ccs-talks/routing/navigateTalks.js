/** Next's native history integration keeps the public client shell mounted
 * while updating usePathname and the browser's Back/Forward history. */
export function navigateTalks(path, { replace = false } = {}) {
  if (typeof window === "undefined") return;
  const next = new URL(path, window.location.origin);
  if (next.origin !== window.location.origin) return;
  const full = next.pathname + next.search + next.hash;
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (full === current) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", full);
}
