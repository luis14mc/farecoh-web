import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface SoundHarmonicsCanvasProps {
  className?: string;
}

export default function SoundHarmonicsCanvas({ className = "" }: SoundHarmonicsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Reduced Motion Check
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 2. Scene, Camera, Renderer setup
    const scene = new THREE.Scene();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // transparent background

    container.appendChild(renderer.domElement);

    // 3. Parametric Harmonic Waves (Polyphonic strings)
    // We create an ensemble of resonant sine waves representing orchestral frequencies
    const lineCount = 42;
    const pointsPerLine = 120;
    const lines: Array<{
      line: THREE.Line;
      geometry: THREE.BufferGeometry;
      positions: Float32Array;
      frequency: number;
      speed: number;
      baseY: number;
      baseZ: number;
      amplitude: number;
      phase: number;
    }> = [];

    // Colors: Primary #0378A6, Secondary #04B2D9, Tertiary #8A038C
    const colorPrimary = new THREE.Color("#0378A6");
    const colorSecondary = new THREE.Color("#04B2D9");
    const colorTertiary = new THREE.Color("#8A038C");

    const lineGroup = new THREE.Group();
    scene.add(lineGroup);

    for (let i = 0; i < lineCount; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(pointsPerLine * 3);
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      // Calculate smooth gradient between primary, secondary, and subtle tertiary
      const t = i / lineCount;
      const lineColor = new THREE.Color();
      if (t < 0.6) {
        lineColor.lerpColors(colorPrimary, colorSecondary, t / 0.6);
      } else {
        lineColor.lerpColors(colorSecondary, colorTertiary, (t - 0.6) / 0.4);
      }

      const opacity = 0.25 + 0.55 * Math.sin(t * Math.PI);
      const material = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: opacity,
        blending: THREE.AdditiveBlending,
        linewidth: 1,
      });

      const line = new THREE.Line(geometry, material);
      lineGroup.add(line);

      lines.push({
        line,
        geometry,
        positions,
        frequency: 0.8 + (i % 7) * 0.35,
        speed: 0.6 + (i * 0.08),
        baseY: (t - 0.5) * 6.5,
        baseZ: (t - 0.5) * 4.0,
        amplitude: 0.7 + (i % 5) * 0.3,
        phase: i * 0.28,
      });
    }

    // 4. Cursor Interaction & Lerp State
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      targetMouseX = (x - 0.5) * 2;
      targetMouseY = (y - 0.5) * 2;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // 5. Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };

    window.addEventListener("resize", handleResize);

    // 6. Animation Loop & Visibility Caching (IntersectionObserver)
    let animationFrameId: number | null = null;
    let isVisible = true;
    let clock = new THREE.Clock();

    const updateGeometry = (time: number) => {
      const span = 18; // horizontal reach
      const step = span / (pointsPerLine - 1);

      for (let l = 0; l < lines.length; l++) {
        const item = lines[l];
        const pos = item.positions;
        const speedTime = time * item.speed * 0.45;

        for (let p = 0; p < pointsPerLine; p++) {
          const x = -span / 2 + p * step;
          const normalX = p / (pointsPerLine - 1);
          // Envelope dampening at ends like a musical vibrating string fixed at both bounds
          const envelope = Math.sin(normalX * Math.PI);

          const harmonic1 = Math.sin(x * 0.65 * item.frequency + speedTime + item.phase);
          const harmonic2 = Math.cos(x * 1.3 * item.frequency - speedTime * 0.6) * 0.4;
          const harmonic3 = Math.sin(x * 2.1 + speedTime * 1.2) * 0.2;

          const y = item.baseY + (harmonic1 + harmonic2 + harmonic3) * item.amplitude * envelope + (mouseY * 0.8 * (1 - envelope));
          const z = item.baseZ + Math.sin(x * 0.5 + speedTime) * 1.2 * envelope + (mouseX * 1.2 * envelope);

          const idx = p * 3;
          pos[idx] = x;
          pos[idx + 1] = y;
          pos[idx + 2] = z;
        }

        item.geometry.attributes.position.needsUpdate = true;
      }
    };

    const animate = () => {
      if (!isVisible) return;

      const elapsedTime = clock.getElapsedTime();

      // Smooth inertia lerp for cursor response
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Subtle scene pitch and yaw
      lineGroup.rotation.y = mouseX * 0.22;
      lineGroup.rotation.x = -mouseY * 0.18;
      lineGroup.rotation.z = Math.sin(elapsedTime * 0.2) * 0.04;

      updateGeometry(elapsedTime);
      renderer.render(scene, camera);

      animationFrameId = requestAnimationFrame(animate);
    };

    // If reduced motion is preferred, render one static frame
    if (prefersReducedMotion) {
      updateGeometry(1.5);
      renderer.render(scene, camera);
    } else {
      animate();
    }

    // 7. IntersectionObserver to freeze loop when off-screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting;

        if (isVisible && !wasVisible && !prefersReducedMotion) {
          clock.start();
          animate();
        } else if (!isVisible && animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(container);

    // 8. Strict Cleanup (Zero Memory Leaks)
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();

      lines.forEach((item) => {
        item.geometry.dispose();
        if (Array.isArray(item.line.material)) {
          item.line.material.forEach((m) => m.dispose());
        } else {
          item.line.material.dispose();
        }
      });

      scene.clear();
      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
