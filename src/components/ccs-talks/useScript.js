"use client";

import { useEffect, useState } from "react";

/**
 * Module-level cache for in-flight / completed script loads.
 * Without this, two components calling `useScript(SAME_SRC)` could each set
 * `loaded=true` based on "is the <script> tag in the DOM?" — a check that's
 * true *before* the script has actually executed. The second consumer would
 * then run its effect with `loaded=true` while `window.gsap` / `window.THREE`
 * are still undefined, silently skip its animation, and leave the UI broken
 * until something forced a re-mount (e.g., a theme toggle).
 *
 * The cache normalises that: every consumer waits on the SAME `onload` and
 * flips state only after the script has truly executed.
 */
const cache = new Map(); // src -> { loaded: boolean, listeners: Set<() => void> }

function getEntry(src) {
  let entry = cache.get(src);
  if (!entry) {
    entry = { loaded: false, listeners: new Set() };
    cache.set(src, entry);
  }
  return entry;
}

export function useScript(src) {
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

    const onLoad = () => {
      entry.loaded = true;
      const ls = Array.from(entry.listeners);
      entry.listeners.clear();
      ls.forEach((fn) => fn());
    };

    let existing = document.querySelector(`script[data-ccs-src="${src}"]`);
    if (!existing) {
      // Reuse a regular <script src> if the page or another lib already added one.
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
      s.addEventListener("load", onLoad, { once: true });
      s.addEventListener("error", () => {
        // Don't keep callers stuck at opacity:0 forever. Treat error as
        // "loaded" so consumers can render their fallback path.
        onLoad();
      }, { once: true });
      document.head.appendChild(s);
    } else {
      // Tag exists. It may or may not have finished executing already. Best
      // signal we have is the data-ccs-loaded marker we set after our onload
      // listener fires. If it's there, we're done; otherwise wait.
      if (existing.getAttribute("data-ccs-loaded") === "1") {
        onLoad();
      } else {
        existing.addEventListener(
          "load",
          () => {
            existing.setAttribute("data-ccs-loaded", "1");
            onLoad();
          },
          { once: true },
        );
      }
    }

    const cb = () => setLoaded(true);
    entry.listeners.add(cb);
    return () => {
      entry.listeners.delete(cb);
    };
  }, [src]);

  return loaded;
}
