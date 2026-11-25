'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import * as THREE from 'three';
import { LIQUID_FRAGMENT_SHADER, LIQUID_VERTEX_SHADER } from './liquidFragment.glsl';
import { useApp } from '@/components/AppProvider';

function getCalmnessForRoute(pathname: string): number {
  if (pathname === '/') return 0.2;
  if (pathname.startsWith('/chapters') || pathname.startsWith('/stats')) return 0.5;
  return 1.0; // /study, /drills, /cbt
}

export function LiquidBackground() {
  const pathname = usePathname() || '/';
  const { settings, adaptiveEco, triggerAdaptiveEco } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const calmnessRef = useRef<number>(getCalmnessForRoute(pathname));
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    calmnessRef.current = getCalmnessForRoute(pathname);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const useStaticFallback = settings.ecoMode || adaptiveEco || prefersReducedMotion;

  useEffect(() => {
    if (useStaticFallback) return;
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl2 = probeCanvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
      });
      const gl1 =
        gl2 ||
        probeCanvas.getContext('webgl', {
          antialias: false,
          alpha: false,
          depth: false,
          stencil: false,
        });
      if (!gl1) {
        triggerAdaptiveEco();
        return;
      }
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      });
    } catch {
      // Fallback to CSS gradient if WebGL context is unavailable
      triggerAdaptiveEco();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      u_pointer: { value: new THREE.Vector2(0.5, 0.5) },
      u_calmness: { value: calmnessRef.current },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: LIQUID_VERTEX_SHADER,
      fragmentShader: LIQUID_FRAGMENT_SHADER,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });

    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    const targetPointer = new THREE.Vector2(0.5, 0.5);
    const onPointerMove = (e: PointerEvent) => {
      targetPointer.set(
        e.clientX / Math.max(window.innerWidth, 1),
        1.0 - e.clientY / Math.max(window.innerHeight, 1)
      );
    };

    const onResize = () => {
      if (!renderer) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    let rafId: number | null = null;
    let lastTs = performance.now();
    let elapsedSec = 0;

    // Adaptive guard window: switch to ecoMode if avg frame time > 24ms over 2 seconds
    let windowStart = performance.now();
    let frameCount = 0;
    let totalFrameMs = 0;

    const renderFrame = (now: number) => {
      if (document.hidden) {
        rafId = null;
        return;
      }

      const rawDt = now - lastTs;
      lastTs = now;
      const clampedDt = Math.min(rawDt, 100);
      elapsedSec += clampedDt * 0.001;

      frameCount += 1;
      totalFrameMs += rawDt;
      if (now - windowStart >= 2000) {
        const avgMs = totalFrameMs / Math.max(1, frameCount);
        if (frameCount >= 10 && avgMs > 24) {
          triggerAdaptiveEco();
          return;
        }
        windowStart = now;
        frameCount = 0;
        totalFrameMs = 0;
      }

      uniforms.u_time.value = elapsedSec * 0.15;
      uniforms.u_pointer.value.lerp(targetPointer, 0.05);
      uniforms.u_calmness.value += (calmnessRef.current - uniforms.u_calmness.value) * 0.08;

      renderer?.render(scene, camera);
      rafId = window.requestAnimationFrame(renderFrame);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else {
        lastTs = performance.now();
        windowStart = lastTs;
        frameCount = 0;
        totalFrameMs = 0;
        if (rafId === null) {
          rafId = window.requestAnimationFrame(renderFrame);
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    if (!document.hidden) {
      rafId = window.requestAnimationFrame(renderFrame);
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      renderer?.dispose();
      if (renderer?.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [useStaticFallback, triggerAdaptiveEco]);

  return (
    <>
      {useStaticFallback ? (
        <div
          aria-hidden="true"
          data-shader-mode="eco"
          className="eco-shader-backdrop"
        />
      ) : (
        <div
          ref={containerRef}
          aria-hidden="true"
          data-shader-mode="webgl"
          className="fixed inset-0 w-screen h-screen -z-10 pointer-events-none"
        />
      )}
      <div aria-hidden="true" className="header-scrim" />
    </>
  );
}
