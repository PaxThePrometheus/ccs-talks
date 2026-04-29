"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLowPower } from "../useLowPower";

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function DynamicBlobs({ intensity = 1 }) {
  const canvasRef = useRef(null);
  const { pixelRatioCap, fpsCap, blobMultiplier, blurMultiplier } = useLowPower();

  const blobCount = Math.max(5, Math.round(12 * blobMultiplier));
  const blobs = useMemo(() => {
    const palette = [
      { c: [255, 86, 140], a: 0.16 },
      { c: [180, 0, 60], a: 0.14 },
      { c: [255, 140, 210], a: 0.10 },
      { c: [120, 0, 30], a: 0.12 },
      { c: [210, 30, 90], a: 0.10 },
    ];

    const n = blobCount;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const p = palette[i % palette.length];
      arr.push({
        x: rand(0.05, 0.95),
        y: rand(0.05, 0.95),
        vx: rand(-0.00042, 0.00042),
        vy: rand(-0.00036, 0.00036),
        r: rand(160, 320),
        r2: rand(220, 420),
        phase: rand(0, Math.PI * 2),
        wobble: rand(0.6, 1.4),
        drift: rand(0.6, 1.4),
        color: p.c,
        alpha: p.a,
      });
    }
    return arr;
  }, [blobCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let paused = false;
    const minFrameMs = 1000 / fpsCap;
    let lastFrame = 0;

    const resize = () => {
      // Cap pixel ratio so the canvas blur step doesn't have 4× pixels to chew
      // through on Retina mobile. The blur dominates wall-clock time here.
      dpr = Math.max(1, Math.min(pixelRatioCap, window.devicePixelRatio || 1));
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const onVisibility = () => { paused = document.visibilityState === "hidden"; };
    document.addEventListener("visibilitychange", onVisibility);

    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (paused) return;
      if (t - lastFrame < minFrameMs - 0.5) return;
      lastFrame = t;

      const time = t * 0.001;
      ctx.clearRect(0, 0, w, h);

      // "metaball" look: strong blur + additive + slight threshold vibe via bright core
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = `blur(${Math.round(72 * intensity * blurMultiplier)}px)`;

      // stronger pull between blobs so merging is obvious
      for (let i = 0; i < blobs.length; i++) {
        const bi = blobs[i];
        for (let j = i + 1; j < blobs.length; j++) {
          const bj = blobs[j];
          const dx = bj.x - bi.x;
          const dy = bj.y - bi.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 0.040) {
            const f = (0.040 - dist2) * 0.0014;
            bi.vx += dx * f;
            bi.vy += dy * f;
            bj.vx -= dx * f;
            bj.vy -= dy * f;
          }
        }
      }

      for (const b of blobs) {
        b.phase += 0.006 * b.wobble;

        // random-ish steering that slowly changes over time
        const steerX = Math.sin(time * 0.22 + b.phase * 1.3) * 0.00008 * b.drift;
        const steerY = Math.cos(time * 0.19 + b.phase * 1.1) * 0.00008 * b.drift;
        b.vx = clamp(b.vx + steerX, -0.0009, 0.0009);
        b.vy = clamp(b.vy + steerY, -0.0009, 0.0009);

        b.x += b.vx;
        b.y += b.vy;

        // soft wrap (keeps motion continuous)
        if (b.x < -0.15) b.x = 1.15;
        if (b.x > 1.15) b.x = -0.15;
        if (b.y < -0.15) b.y = 1.15;
        if (b.y > 1.15) b.y = -0.15;

        const rr = b.r + (b.r2 - b.r) * (0.5 + 0.5 * Math.sin(time * 0.65 + b.phase));
        const cx = b.x * w;
        const cy = b.y * h;

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        const a = b.alpha * intensity;
        g.addColorStop(0, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${a})`);
        g.addColorStop(0.33, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${a * 0.75})`);
        g.addColorStop(0.65, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${a * 0.25})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }

      // add a sharper core pass to sell the "lava lamp" blobs
      ctx.filter = `blur(${Math.round(20 * intensity * blurMultiplier)}px)`;
      for (const b of blobs) {
        const rr = (b.r * 0.34) + (b.r2 * 0.18) * (0.5 + 0.5 * Math.sin(time * 0.9 + b.phase));
        const cx = b.x * w;
        const cy = b.y * h;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        const a = (b.alpha * 0.55) * intensity;
        g.addColorStop(0, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${a})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [blobs, intensity, pixelRatioCap, fpsCap, blurMultiplier]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: 1,
        mixBlendMode: "screen",
      }}
    />
  );
}

