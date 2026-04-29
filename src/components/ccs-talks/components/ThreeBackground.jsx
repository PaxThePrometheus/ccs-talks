"use client";

import { useEffect, useRef } from "react";
import { THREE_CDN } from "../cdn";
import { styles, THEME } from "../theme";
import { useScript } from "../useScript";

export function ThreeBackground({ active }) {
  const canvasRef = useRef(null);
  const threeLoaded = useScript(THREE_CDN);
  const animRef = useRef(null);

  useEffect(() => {
    if (!threeLoaded || !active || typeof window === "undefined" || !window.THREE) return;
    const THREE = window.THREE;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    const mkMat = (hex, opacity) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.9,
        metalness: 0.06,
        transparent: true,
        opacity,
      });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.8, 64, 64), mkMat(0x8b0032, 0.55));
    sphere.position.set(2.5, 0.5, -2);
    scene.add(sphere);

    const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 32), mkMat(0xad0040, 0.4));
    sphere2.position.set(-2.8, -1, -3);
    scene.add(sphere2);

    const sphere3 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), mkMat(0x6b0020, 0.35));
    sphere3.position.set(0, 2.5, -4);
    scene.add(sphere3);

    scene.add(new THREE.AmbientLight(0xffffff, 0.28));
    const point = new THREE.PointLight(0xff3060, 2.2, 12);
    point.position.set(-2, 3, 3);
    scene.add(point);
    const point2 = new THREE.PointLight(0x8b0032, 1.6, 10);
    point2.position.set(4, -2, 2);
    scene.add(point2);

    let t = 0;
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      t += 0.005;
      sphere.rotation.y = t * 0.3;
      sphere.rotation.x = Math.sin(t * 0.2) * 0.1;
      sphere.position.y = 0.5 + Math.sin(t * 0.4) * 0.15;
      sphere2.rotation.y = -t * 0.2;
      sphere2.position.x = -2.8 + Math.sin(t * 0.3) * 0.1;
      sphere3.rotation.z = t * 0.15;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [threeLoaded, active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        ...styles.canvas,
        filter: "blur(0.2px)",
        mixBlendMode: "screen",
        background: `radial-gradient(700px 420px at 70% 35%, rgba(155,0,40,0.15), transparent 60%),
          radial-gradient(500px 380px at 20% 70%, rgba(192,0,42,0.12), transparent 58%),
          radial-gradient(800px 520px at 85% 80%, rgba(255,96,128,0.08), transparent 62%)`,
        borderColor: THEME.colors.divider,
      }}
    />
  );
}

