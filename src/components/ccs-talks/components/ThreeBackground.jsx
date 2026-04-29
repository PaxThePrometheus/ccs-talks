"use client";

import { useEffect, useRef } from "react";
import { THREE_CDN } from "../cdn";
import { styles } from "../theme";
import { useScript } from "../useScript";
import { useLowPower } from "../useLowPower";

/**
 * Slow, soft lava-lamp:
 * - fullscreen plane carrying a fragment shader that sums radial fields
 *   per blob (metaballs), so blobs fuse at their edges.
 * - each blob has a "life" 0..1 ramp: it grows in from 0 → 1 after spawning,
 *   holds, then shrinks/fades back to 0 before respawning. This avoids the
 *   ugly "pop in / pop out" when blobs wrap top↔bottom.
 * - colors are intentionally muted vs. before; the look should feel like wax
 *   through frosted glass, not neon stickers.
 */

// Maximum blob count. The actual count is scaled down on low-end devices
// (see effect below). The shader compiles for the max so we never have to
// recompile when the count changes — we just send 0-radius blobs for the
// "extras" so they contribute nothing.
const NUM_BLOBS = 8;

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// We pass per-blob (x, y, radius * life) into uBlobs.xyz. When life = 0 the
// blob contributes ~zero field (so it's fully invisible). The smoothstep on
// the field threshold handles the visual softness.
const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform vec2  uRes;
  uniform float uTime;
  uniform vec3  uBlobs[${NUM_BLOBS}];
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform float uIntensity;
  uniform float uLight;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    float aspect = uRes.x / max(uRes.y, 1.0);
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= aspect;

    float field = 0.0;
    for (int i = 0; i < ${NUM_BLOBS}; i++) {
      vec2  c = uBlobs[i].xy;
      float r = uBlobs[i].z; // already includes life
      vec2  d = p - c;
      float f = (r * r) / (dot(d, d) + 0.0009);
      field += f;
    }
    field *= uIntensity;

    // softer threshold band -> blobs feel like wax with translucent edges
    float edge = smoothstep(0.78, 1.05, field);
    float core = smoothstep(1.10, 1.85, field);

    vec3 col = mix(uColorC, uColorB, edge);
    col = mix(col, uColorA, core);

    // very subtle film grain so it doesn't look plastic
    float n = (hash(gl_FragCoord.xy * 0.7) - 0.5) * 0.025;
    col += n;

    // overall intensity damp — keep it muted
    col *= mix(0.62, 0.72, uLight);

    float alpha = clamp(edge, 0.0, 1.0);
    alpha *= mix(0.78, 0.55, uLight);

    gl_FragColor = vec4(col, alpha);
  }
`;

export function ThreeBackground({ active = true, accent = "#ff6080", light = false }) {
  const canvasRef = useRef(null);
  const threeLoaded = useScript(THREE_CDN);
  const animRef = useRef(null);
  const { pixelRatioCap, fpsCap, blobMultiplier } = useLowPower();

  useEffect(() => {
    if (!threeLoaded || !active || typeof window === "undefined" || !window.THREE) return;
    const THREE = window.THREE;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Active blob count: capped at NUM_BLOBS, scaled down on low-end devices.
    const activeCount = Math.max(3, Math.round(NUM_BLOBS * blobMultiplier));

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      // Antialiasing is the single most expensive WebGL setting on integrated
      // GPUs. We disable it on low-end and rely on the shader's smoothstep for
      // soft edges (which is what gives the wax look anyway).
      antialias: pixelRatioCap >= 2,
      premultipliedAlpha: false,
      // Hint to the GPU scheduler that this is a background effect, not a game.
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const aspect = () => window.innerWidth / Math.max(window.innerHeight, 1);

    const spawn = (overrides = {}) => {
      const dir = Math.random() < 0.5 ? -1 : 1; // up or down
      return {
        x: (Math.random() - 0.5) * 2.0 * aspect(),
        // start a bit past the edge so the fade-in feels organic
        y: dir > 0 ? -1.15 - Math.random() * 0.15 : 1.15 + Math.random() * 0.15,
        targetR: 0.34 + Math.random() * 0.36, // base radius
        // SLOW: half the previous speed
        vy: dir * (0.00045 + Math.random() * 0.00065),
        vx: (Math.random() - 0.5) * 0.00035,
        phase: Math.random() * Math.PI * 2,
        breathSpeed: 0.14 + Math.random() * 0.18,
        // life cycle
        age: 0,                       // seconds-ish
        ageIn: 1.6 + Math.random() * 0.8,   // fade-in duration (seconds)
        ageHold: 9 + Math.random() * 6,     // visible duration before fading out
        ageOut: 1.6 + Math.random() * 0.8,  // fade-out duration
        ...overrides,
      };
    };

    const blobs = new Array(NUM_BLOBS).fill(0).map(() => {
      const b = spawn();
      // stagger initial state so we don't start all at life=0
      b.age = Math.random() * (b.ageIn + b.ageHold);
      b.y = (Math.random() - 0.5) * 2.0;
      return b;
    });

    const blobUniformArr = blobs.map((b) => new THREE.Vector3(0, 0, 0));

    const COLOR_HOT = light ? new THREE.Color(0xffd0dc) : new THREE.Color(0xff7a98);
    const COLOR_MID = light ? new THREE.Color(0xff9bb1) : new THREE.Color(0xa50026);
    const COLOR_CLD = light ? new THREE.Color(0xffeaef) : new THREE.Color(0x2c0010);
    const accentColor = new THREE.Color(accent);
    COLOR_HOT.lerp(accentColor, 0.20);

    const uniforms = {
      uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uTime: { value: 0 },
      uBlobs: { value: blobUniformArr },
      uColorA: { value: COLOR_HOT },
      uColorB: { value: COLOR_MID },
      uColorC: { value: COLOR_CLD },
      uIntensity: { value: 0.95 },
      uLight: { value: light ? 1.0 : 0.0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    let prev = performance.now();
    let paused = false;
    const minFrameMs = 1000 / fpsCap;
    let lastFrame = 0;

    const onVisibility = () => {
      paused = document.visibilityState === "hidden";
      // Reset prev so we don't get a giant dt jump after resuming.
      prev = performance.now();
      lastFrame = prev;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const animate = (now) => {
      animRef.current = requestAnimationFrame(animate);
      if (paused) return;

      // Frame-rate cap: respect fpsCap (60 on desktop, 30 on low-power).
      // We still keep rAF driving the loop so we hand back to the GPU cleanly.
      if (now - lastFrame < minFrameMs - 0.5) return;
      lastFrame = now;

      const dt = Math.min(0.05, (now - prev) / 1000); // seconds, capped
      prev = now;

      uniforms.uTime.value += dt;

      const A = aspect();

      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        b.age += dt;

        // life envelope (0 .. 1 .. 0)
        let life;
        if (b.age < b.ageIn) {
          life = b.age / b.ageIn;
          // smoothstep
          life = life * life * (3 - 2 * life);
        } else if (b.age < b.ageIn + b.ageHold) {
          life = 1;
        } else {
          const out = (b.age - b.ageIn - b.ageHold) / b.ageOut;
          life = 1 - Math.min(1, out);
          life = life * life * (3 - 2 * life);
        }

        // motion (slow)
        b.y += b.vy * (60 * dt); // dt-normalized so framerate doesn't matter
        b.x += (b.vx + Math.sin(uniforms.uTime.value * 0.18 + b.phase) * 0.0006) * (60 * dt);

        // wrap horizontally (no fade needed; small corrections)
        if (b.x > A * 1.2) b.x = -A * 1.2;
        if (b.x < -A * 1.2) b.x = A * 1.2;

        // breathing radius (very small variance)
        const breath = 1 + Math.sin(uniforms.uTime.value * b.breathSpeed + b.phase) * 0.06;

        // when life ends, respawn instead of teleporting (no popping)
        if (b.age > b.ageIn + b.ageHold + b.ageOut) {
          blobs[i] = spawn();
          blobUniformArr[i].set(blobs[i].x, blobs[i].y, 0); // 0 radius, will fade in
          continue;
        }

        // out-of-bounds vertical: respawn (the life envelope already reaches 0
        // before this should ever trigger, so this is a safety net only)
        if (b.y > 1.6 || b.y < -1.6) {
          blobs[i] = spawn();
          blobUniformArr[i].set(blobs[i].x, blobs[i].y, 0);
          continue;
        }

        // Disabled blobs (beyond activeCount) get radius 0 so the shader sees
        // them but they contribute nothing to the field. Cheaper than
        // recompiling the shader when fpsCap/blobMultiplier change.
        const r = i < activeCount ? b.targetR * breath * life : 0;
        blobUniformArr[i].set(b.x, b.y, r);
      }

      uniforms.uBlobs.value = blobUniformArr;

      renderer.render(scene, camera);
    };
    animRef.current = requestAnimationFrame(animate);

    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      uniforms.uRes.value.set(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [threeLoaded, active, accent, light, pixelRatioCap, fpsCap, blobMultiplier]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        ...styles.canvas,
        opacity: 1,
        background: light
          ? "radial-gradient(900px 800px at 50% 50%, rgba(255,255,255,0.0) 0%, rgba(255,235,240,0.40) 80%)"
          : "radial-gradient(900px 800px at 50% 50%, rgba(40,0,16,0.0) 0%, rgba(20,0,8,0.55) 80%)",
      }}
    />
  );
}
