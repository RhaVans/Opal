'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import * as THREE from 'three';
import { LIQUID_FRAGMENT_SHADER, LIQUID_VERTEX_SHADER } from './liquidFragment.glsl';
import { useApp } from '@/components/AppProvider';
import { subscribeFeedback } from '@/lib/motion/feedbackBus';
import { INTENT_SHADER_RGB } from '@/lib/motion/tokens';

function getCalmnessForRoute(pathname: string): number {
  if (pathname === '/' || pathname === '/stats') return 0.0;
  if (pathname.startsWith('/chapters') || pathname.startsWith('/drills')) return 0.45;
  return 0.80; // /study, /cbt
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
      const canvas = document.createElement('canvas');
      const ctxOpts: WebGLContextAttributes = {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      };
      const gl = canvas.getContext('webgl2', ctxOpts) || canvas.getContext('webgl', ctxOpts);
      if (!gl || (typeof gl.isContextLost === 'function' && gl.isContextLost())) {
        triggerAdaptiveEco();
        return;
      }
      renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl as WebGLRenderingContext,
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

    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      triggerAdaptiveEco();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

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
      u_feedbackColor: { value: new THREE.Vector3(...INTENT_SHADER_RGB.neutral) },
      u_feedbackEnergy: { value: 0 },
      u_feedbackOrigin: { value: new THREE.Vector2(0.5, 0.5) },
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
      renderer.setPixelRatio(1);
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    const unsubscribeFeedback = subscribeFeedback((signal) => {
      const rgb = INTENT_SHADER_RGB[signal.intent];
      uniforms.u_feedbackColor.value.set(rgb[0], rgb[1], rgb[2]);
      if (signal.shaderPulse) {
        uniforms.u_feedbackEnergy.value = Math.min(0.4, Math.max(0, signal.shaderPulse.energy));
        if (signal.shaderPulse.origin) {
          uniforms.u_feedbackOrigin.value.set(
            signal.shaderPulse.origin[0],
            signal.shaderPulse.origin[1]
          );
        }
      }
    });

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
      uniforms.u_calmness.value += (calmnessRef.current - uniforms.u_calmness.value) * 0.05;
      uniforms.u_feedbackEnergy.value *= Math.exp(-3.5 * (clampedDt * 0.001));
      if (uniforms.u_feedbackEnergy.value < 0.001) {
        uniforms.u_feedbackEnergy.value = 0;
      }

      try {
        renderer?.render(scene, camera);
      } catch {
        triggerAdaptiveEco();
        return;
      }
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
      unsubscribeFeedback();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
      geometry.dispose();
      material.dispose();
      renderer?.dispose();
      if (renderer?.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [useStaticFallback, triggerAdaptiveEco]);

  const fixedBackdropStyle = {
    position: 'fixed' as const,
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex: -10,
    pointerEvents: 'none' as const,
  };

  return (
    <>
      {useStaticFallback ? (
        <div
          aria-hidden="true"
          data-shader-mode="eco"
          style={fixedBackdropStyle}
          className="eco-shader-backdrop"
        />
      ) : (
        <div
          ref={containerRef}
          aria-hidden="true"
          data-shader-mode="webgl"
          style={fixedBackdropStyle}
          className="fixed inset-0 w-screen h-screen -z-10 pointer-events-none"
        />
      )}
      <div aria-hidden="true" className="header-scrim" />
    </>
  );
}
