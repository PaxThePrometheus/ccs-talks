"use client";

import { useEffect, useState } from "react";

/**
 * Performance budget for animated shells (WebGL + canvas2d).
 *
 * Previously M1 laptops often looked “healthy” (8 cores / default memory) yet still
 * paid Retina-sized fullscreen shaders + stacked backdrop blurs everywhere.
 *
 * Tiers:
 *   - minimal: prefers-reduced-motion OR very weak CPU/memory OR thin network/viewport.
 *   - balanced: DEFAULT for laptops / Retina — lower fps, tighter DPR cap, softer 2D blur.
 *   - smooth: roomy desktop — still capped vs old “60fps + native DPR” defaults.
 *
 * SSR first paint assumes balanced so we don’t flash at 60 fps briefly.
 */

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function useLowPower() {
  const [state, setState] = useState({
    tier: /** @type {"minimal"|"balanced"|"smooth"} */ ("balanced"),
    isLowPower: false,
    reduceMotion: false,
    pixelRatioCap: 1.2,
    fpsCap: 24,
    blobMultiplier: 0.65,
    blurMultiplier: 0.42,
    /** Skip second raster pass inside DynamicBlobs (big win at low blur multipliers). */
    cheapCanvasPass: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const compute = () => {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
      const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : null;
      const memRaw = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : null;

      /** `deviceMemory` is missing in Safari/Firefox — don’t penalize unknown memory. */
      const coreWeak = cores != null && cores <= 4;
      const memoryWeak = memRaw != null && memRaw <= 4;
      const conn = navigator.connection;
      const slowNet = conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g" || conn?.effectiveType === "3g";
      const saveData = conn?.saveData === true;
      const narrow = window.innerWidth <= 720;

      const dpr = window.devicePixelRatio || 1;
      /** Roughly laptop Retina tier without treating unknown memory as infinite. */
      const efficiencyHint = reduce || slowNet || saveData || narrow || coreWeak || memoryWeak || dpr >= 1.75 || (cores ?? 99) <= 8;

      const isLowPower = reduce || coreWeak || memoryWeak || slowNet || saveData || narrow;

      /** Big desktop assumptions only when unconstrained telemetry looks strong. */
      const looksPremiumStationary =
        !reduce &&
        !slowNet &&
        !saveData &&
        !narrow &&
        dpr < 2 &&
        cores != null &&
        cores >= 8 &&
        typeof memRaw === "number" &&
        memRaw >= 8 &&
        window.innerWidth >= 1200;

      const tier = isLowPower ? "minimal" : looksPremiumStationary ? "smooth" : "balanced";

      let fpsCap = 24;
      let pixelRatioCap = 1.15;
      let blobMultiplier = 0.62;
      let blurMultiplier = 0.42;
      let cheapCanvasPass = true;

      if (tier === "minimal") {
        fpsCap = 18;
        pixelRatioCap = 1;
        blobMultiplier = 0.42;
        blurMultiplier = 0.26;
      } else if (tier === "smooth") {
        fpsCap = 40;
        pixelRatioCap = clamp(dpr <= 2 ? Math.min(dpr * 0.92, dpr) : 1.5, 1, 2);
        blobMultiplier = 0.92;
        blurMultiplier = 0.92;
        cheapCanvasPass = false;
      } else if (tier === "balanced") {
        fpsCap = efficiencyHint ? 22 : 26;
        /** Retina dominates cost — shave internal resolution aggressively. */
        pixelRatioCap = clamp(Math.min(dpr <= 2 ? Math.max(1, dpr * 0.58) : 1.25, dpr), 1, efficiencyHint ? 1.35 : 1.45);
        blobMultiplier = efficiencyHint ? 0.58 : 0.68;
        blurMultiplier = efficiencyHint ? 0.34 : 0.42;
      }

      setState({
        tier,
        isLowPower,
        reduceMotion: reduce,
        pixelRatioCap,
        fpsCap,
        blobMultiplier,
        blurMultiplier,
        cheapCanvasPass,
      });
    };

    compute();
    window.addEventListener("resize", compute);
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    mq?.addEventListener?.("change", compute);

    /** Network Information API churn (Chrome/Android). */
    navigator.connection?.addEventListener?.("change", compute);

    return () => {
      window.removeEventListener("resize", compute);
      mq?.removeEventListener?.("change", compute);
      navigator.connection?.removeEventListener?.("change", compute);
    };
  }, []);

  return state;
}
