"use client";

import { useEffect, useState } from "react";

/**
 * Waits until a `<script>` for `src` has settled, then notifies all consumers.
 *
 * Options:
 * - `expectGlobal` — `"THREE"` | `"gsap"` etc. Ensures `window[expectGlobal]`
 *   exists before we flip ready (CDN race / reused `<script>` where `load` never
 *   fires twice). Gives up after a timeout so callers can still render fallback UI.
 *
 * Guards one shared polling interval per `src` (`entry.pollId`).
 */
const cache = new Map(); // src -> { loaded, listeners: Set<fn>, pollId?: number|null }

function getEntry(src) {
  let entry = cache.get(src);
  if (!entry) {
    entry = { loaded: false, listeners: new Set(), pollId: null };
    cache.set(src, entry);
  }
  return entry;
}

/** @param {{ expectGlobal?: string }} [options] */
export function useScript(src, options = {}) {
  const expectGlobal = options.expectGlobal;

  const [loaded, setLoaded] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!cache.get(src)?.loaded;
  });

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const entry = getEntry(src);

    if (entry.loaded) {
      setLoaded(true);
      return undefined;
    }

    const finalize = () => {
      if (entry.pollId != null) {
        window.clearInterval(entry.pollId);
        entry.pollId = null;
      }
      if (entry.loaded) return;
      entry.loaded = true;
      document.querySelector(`script[data-ccs-src="${src}"]`)?.setAttribute("data-ccs-loaded", "1");
      const ls = Array.from(entry.listeners);
      entry.listeners.clear();
      ls.forEach((fn) => fn());
    };

    const settle = () => {
      if (entry.loaded) return;

      if (!expectGlobal) {
        finalize();
        return;
      }

      if (typeof window !== "undefined" && window[expectGlobal]) {
        finalize();
        return;
      }

      if (entry.pollId != null) return;

      const t0 = Date.now();
      const maxMs = 9000;

      entry.pollId = window.setInterval(() => {
        const ok = typeof window !== "undefined" && !!window[expectGlobal];
        if (ok || Date.now() - t0 > maxMs) {
          if (entry.pollId != null) {
            window.clearInterval(entry.pollId);
            entry.pollId = null;
          }
          finalize();
        }
      }, 40);
    };

    let existing = document.querySelector(`script[data-ccs-src="${src}"]`);
    if (!existing) {
      const native = document.querySelector(`script[src="${src}"]`);
      if (native) {
        existing = native;
        existing.setAttribute("data-ccs-src", src);
      }
    }

    if (!existing) {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.setAttribute("data-ccs-src", src);
      s.addEventListener("load", settle, { once: true });
      s.addEventListener("error", settle, { once: true });
      document.head.appendChild(s);
    } else if (existing.getAttribute("data-ccs-loaded") === "1") {
      settle();
    } else {
      existing.addEventListener("load", settle, { once: true });
      existing.addEventListener("error", settle, { once: true });
      /** Script might already have executed (`load` will not replay). */
      queueMicrotask(() => settle());
    }

    const cb = () => setLoaded(true);
    entry.listeners.add(cb);
    return () => {
      entry.listeners.delete(cb);
    };
  }, [src, expectGlobal]);

  return loaded;
}
