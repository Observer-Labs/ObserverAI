"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const COLS = 70;
const ROWS = 40;
const SPACING = 1.6;

/**
 * Subtle three.js "signal field" behind the hero: a slowly undulating grid of
 * dots in slate with sparse brand-orange points. Skipped entirely when the
 * user prefers reduced motion.
 */
export default function HeroCanvas({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / Math.max(mount.clientHeight, 1), 1, 1000);
    camera.position.set(0, 14, 42);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const count = COLS * ROWS;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const slate = new THREE.Color("#94a3b8");
    const orange = new THREE.Color("#f97316");
    let i = 0;
    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        positions[i * 3] = (x - COLS / 2) * SPACING;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (z - ROWS / 2) * SPACING;
        // deterministic sparse orange accents (no Math.random → stable between renders)
        const c = (x * 31 + z * 17) % 13 === 0 ? orange : slate;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        i++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let frame = 0;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const pos = geo.getAttribute("position") as THREE.BufferAttribute;
      let j = 0;
      for (let x = 0; x < COLS; x++) {
        for (let z = 0; z < ROWS; z++) {
          pos.setY(j, Math.sin(x * 0.35 + t * 0.8) * 0.7 + Math.cos(z * 0.3 + t * 0.6) * 0.7);
          j++;
        }
      }
      pos.needsUpdate = true;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onResize = () => {
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} aria-hidden className={className} />;
}
