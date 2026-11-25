'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkle } from '@/components/ui/Sparkle';
import { useViewTransition } from '@/components/motion/ViewTransitionProvider';

interface FluidDockOrbProps {
  href: string;
  ariaLabel: string;
  active?: boolean;
}

export function FluidDockOrb({ href, ariaLabel, active = false }: FluidDockOrbProps) {
  const router = useRouter();
  const { navigate } = useViewTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pressedRef = useRef(false);
  const impulseRef = useRef(0);
  const navTimerRef = useRef<number | null>(null);

  const [isPressed, setIsPressed] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  useEffect(() => {
    return () => {
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 112;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;

    let rafId: number | null = null;
    let phase = 0;
    let lastTs = performance.now();

    const drawFrame = (now: number) => {
      const dt = Math.min((now - lastTs) * 0.001, 0.08);
      lastTs = now;

      // Surge swirl speed while pressed or launching for real fluid momentum
      impulseRef.current = Math.max(0, impulseRef.current - dt * 2.2);
      const speed = 1.15 + (pressedRef.current ? 2.4 : 0) + impulseRef.current * 3.8;
      phase += dt * speed;

      // Deep Persian blue base matching #4D3EA3
      ctx.clearRect(0, 0, size, size);
      const baseGrad = ctx.createLinearGradient(0, 0, size, size);
      baseGrad.addColorStop(0, '#4D3EA3');
      baseGrad.addColorStop(0.55, '#433495');
      baseGrad.addColorStop(1, '#31237A');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, size, size);

      // Orbiting viscous fluid blobs (same palette family: #758AD1, #6151C5, #E1DAFB)
      const blobs = [
        {
          x: cx + Math.cos(phase * 1.1) * 19 + Math.sin(phase * 0.7) * 6,
          y: cy + Math.sin(phase * 0.9) * 18,
          r: 40 + Math.sin(phase * 1.5) * 5,
          c0: 'rgba(117, 138, 209, 0.88)',
          c1: 'rgba(77, 62, 163, 0)',
        },
        {
          x: cx + Math.cos(phase * 1.35 + 2.2) * 21,
          y: cy + Math.sin(phase * 1.15 + 1.4) * 20,
          r: 36 + Math.cos(phase * 1.7) * 5,
          c0: 'rgba(104, 86, 212, 0.9)',
          c1: 'rgba(77, 62, 163, 0)',
        },
        {
          x: cx + Math.sin(phase * 1.6 + 4.1) * 22,
          y: cy + Math.cos(phase * 1.25 + 3.0) * 19,
          r: 28 + Math.sin(phase * 2.1) * 4,
          c0: 'rgba(225, 218, 251, 0.42)',
          c1: 'rgba(117, 138, 209, 0)',
        },
        {
          x: cx + Math.cos(phase * 0.8 + 5.1) * 16,
          y: cy + Math.sin(phase * 1.4 + 0.5) * 22,
          r: 34,
          c0: 'rgba(69, 12, 63, 0.36)',
          c1: 'rgba(49, 35, 122, 0)',
        },
      ];

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 3; i++) {
        const b = blobs[i];
        const g = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r);
        g.addColorStop(0, b.c0);
        g.addColorStop(1, b.c1);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Subtle depth pocket so center stays grounded behind white Sparkle
      const d = blobs[3];
      const dg = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, d.r);
      dg.addColorStop(0, d.c0);
      dg.addColorStop(1, d.c1);
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();

      // Organic liquid caustic crest curving around upper rim
      ctx.save();
      ctx.beginPath();
      const waveAmp = 4 + impulseRef.current * 5;
      ctx.moveTo(0, cy + Math.sin(phase) * waveAmp);
      for (let x = 0; x <= size; x += 8) {
        const y =
          cy * 0.62 +
          Math.sin(phase * 1.4 + x * 0.065) * waveAmp +
          Math.cos(phase * 0.9 - x * 0.04) * (waveAmp * 0.6);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(size, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      const rimGrad = ctx.createLinearGradient(0, 0, size * 0.8, cy);
      rimGrad.addColorStop(0, 'rgba(225, 218, 251, 0.36)');
      rimGrad.addColorStop(0.5, 'rgba(117, 138, 209, 0.2)');
      rimGrad.addColorStop(1, 'rgba(77, 62, 163, 0)');
      ctx.fillStyle = rimGrad;
      ctx.fill();
      ctx.restore();

      // Specular inner rim arc
      const rimShift = phase * 0.7;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 210, 244, 0.35)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 7, rimShift, rimShift + 1.45);
      ctx.stroke();
      ctx.restore();

      if (!prefersReducedMotion && !document.hidden) {
        rafId = window.requestAnimationFrame(drawFrame);
      } else {
        rafId = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (!prefersReducedMotion && rafId === null) {
        lastTs = performance.now();
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    drawFrame(performance.now());

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [prefersReducedMotion]);

  const handlePointerDown = () => {
    pressedRef.current = true;
    impulseRef.current = 1.0;
    setIsPressed(true);
  };

  const handlePointerUpOrCancel = () => {
    pressedRef.current = false;
    setIsPressed(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    if (prefersReducedMotion) {
      return;
    }
    e.preventDefault();
    if (isLaunching) return;
    impulseRef.current = 1.4;
    setIsLaunching(true);
    navTimerRef.current = window.setTimeout(() => {
      navigate(href, { type: 'orb-reveal', targetMorphId: 'study-card' });
    }, 150);
  };

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onPointerLeave={handlePointerUpOrCancel}
      onClick={handleClick}
      className={[
        'fluid-dock-orb relative -mt-4 flex items-center justify-center w-14 h-14 min-w-[56px] min-h-[56px] rounded-full border-[3px] border-[#E1DAFB] bg-[#4D3EA3] text-white shadow-[var(--shadow-medium)] select-none',
        isPressed ? 'is-pressed' : '',
        isLaunching ? 'is-launching' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Expanding outer liquid halo ring on press & launch */}
      <span aria-hidden="true" className="fluid-orb-halo" />
      <span aria-hidden="true" className="fluid-orb-pulse" />

      {/* Live Canvas 2D fluid field */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </span>

      <Sparkle
        size={24}
        color="#FFFFFF"
        className="fluid-orb-sparkle relative z-10 pointer-events-none drop-shadow-[0_1px_4px_rgba(29,29,31,0.35)]"
      />
    </Link>
  );
}
