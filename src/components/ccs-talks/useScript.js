"use client";

import { useCallback, useSyncExternalStore } from "react";
import { GSAP_CDN, THREE_CDN } from "./cdn";

// Local, on-demand chunks share one load across all mounted consumers. No CDN
// requests, injected scripts, or readiness polling on the rendering thread.
const cache = new Map();
function entryFor(src) {
  if (!cache.has(src)) cache.set(src, { ready: false, promise: null, listeners: new Set() });
  return cache.get(src);
}
function load(src, entry) {
  if (entry.promise || entry.ready) return;
  const pending = src === GSAP_CDN ? import("gsap").then((module) => {
    window.gsap = module.gsap || module.default?.gsap || module.default;
  }) : src === THREE_CDN ? import("three").then((module) => {
    window.THREE = module;
  }) : Promise.reject(new Error("Unsupported visual library"));
  entry.promise = pending.then(() => {
    entry.ready = true;
    for (const notify of entry.listeners) notify();
  }).catch(() => {
    // Components retain visible, static fallbacks if a chunk cannot load.
    entry.promise = null;
  });
}

export function useScript(src) {
  const subscribe = useCallback((notify) => {
    const entry = entryFor(src);
    entry.listeners.add(notify);
    load(src, entry);
    return () => entry.listeners.delete(notify);
  }, [src]);
  const snapshot = useCallback(() => entryFor(src).ready, [src]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
