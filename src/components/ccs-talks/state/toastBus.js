/** Imperative toast API (avoids provider ordering issues with AppState). */

let seq = 0;
const listeners = new Set();

/**
 * @param {(item: { id: number; message: string; type: string }) => void} fn
 * @returns {() => void}
 */
export function toastSubscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * @param {string} message
 * @param {"info"|"error"|"success"} [type]
 */
export function showToast(message, type = "info") {
  const id = ++seq;
  const item = { id, message: String(message || "").trim() || "Something went wrong.", type };
  for (const fn of listeners) {
    try {
      fn(item);
    } catch {
      /* ignore subscriber errors */
    }
  }
}
