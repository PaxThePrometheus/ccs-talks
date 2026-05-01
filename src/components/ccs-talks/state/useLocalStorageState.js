"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hydration-safe local-storage-backed state.
 *
 * The first render (both on the server and on the client) ALWAYS returns
 * `initialValue` so the resulting HTML is identical and React's hydration
 * check passes. Immediately after mount we read the actual stored value and
 * push it into state — that triggers a single re-render where the UI snaps
 * to the persisted value.
 *
 * If we read `localStorage` during the lazy `useState` initializer instead,
 * React renders different HTML on the server (which has no `localStorage`,
 * so it falls back to `initialValue`) than on the first client render (which
 * reads the stored value), and React refuses to hydrate the tree.
 */
export function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  // We don't want the "hydrate from storage" effect to overwrite state when
  // the user mutates state on the very first render (e.g., a controlled input
  // typed into before storage hydrated). Track whether hydration has happened.
  const hydratedRef = useRef(false);

  // Hydrate from storage AFTER mount so SSR + first CSR render are identical.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        setValue(parsed);
      }
    } catch {
      // Stored value was bad — ignore and keep the default.
    } finally {
      hydratedRef.current = true;
    }
    // We only want to read storage once, on mount, per `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist on changes, but only AFTER the initial hydration pass — otherwise
  // we'd write the default value back to storage before reading the saved one.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore (quota exceeded, private mode, etc.)
    }
  }, [key, value]);

  return [value, setValue];
}
