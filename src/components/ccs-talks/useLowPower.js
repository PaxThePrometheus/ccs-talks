"use client";

import { useEffect, useState } from "react";

/**
 * Best-effort low-end device detection. We do NOT disable any effect — we just
 * dial back the cost (fewer blobs, lower DPR, throttled framerate, smaller
 * blur radii). Returns a stable shape so consumers can read it without
 * branching everywhere.
 *
 * Heuristics, soft-OR'd together:
 *   - prefers-reduced-motion (always respected)
 *   - navigator.hardwareConcurrency <= 4
 *   - navigator.deviceMemory <= 4 (Chrome only)
 *   - effectiveType in ('slow-2g', '2g', '3g')
 *   - viewport width <= 720 (mobile is usually battery-bound)
 *
 * The first paint (SSR) reports `desktop, healthy` to avoid a thrash on hydrate.
 */
export function useLowPower() {
  const [state, setState] = useState({
    isLowPower: false,
    reduceMotion: false,
    pixelRatioCap: 2,
    fpsCap: 60,
    blobMultiplier: 1,
    blurMultiplier: 1,
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const compute = () => {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
      const cores = navigator.hardwareConcurrency || 8;
      const mem = navigator.deviceMemory || 8;
      const conn = navigator.connection?.effectiveType;
      const slowNet = conn === "slow-2g" || conn === "2g" || conn === "3g";
      const small = window.innerWidth <= 720;
      const battery = navigator.getBattery ? null : null; // hint only — Battery API removed in most browsers

      const lowEnd = reduce || cores <= 4 || mem <= 4 || slowNet || small;

      setState({
        isLowPower: lowEnd,
        reduceMotion: reduce,
        // Cap pixel ratio so WebGL doesn't push 4× as many fragments on a Retina phone.
        pixelRatioCap: lowEnd ? 1.25 : 2,
        // Throttle the lava-lamp shader to ~30 fps on low-end (still feels organic).
        fpsCap: lowEnd ? 30 : 60,
        // Halve metaball count on low-end. Effect still reads as a lava lamp.
        blobMultiplier: lowEnd ? 0.6 : 1,
        // Canvas2D blur is the single most expensive step in DynamicBlobs.
        blurMultiplier: lowEnd ? 0.55 : 1,
      });
    };

    compute();
    window.addEventListener("resize", compute);
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    mq?.addEventListener?.("change", compute);

    return () => {
      window.removeEventListener("resize", compute);
      mq?.removeEventListener?.("change", compute);
    };
  }, []);

  return state;
}
