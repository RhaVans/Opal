'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionMode } from './MotionProvider';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
}

export function AnimatedNumber({
  value,
  suffix = '',
  prefix = '',
  durationMs = 360,
}: AnimatedNumberProps) {
  const { reduced } = useMotionMode();
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);

  useEffect(() => {
    if (reduced) {
      currentRef.current = value;
      setDisplay(value);
      return;
    }

    const startVal = currentRef.current;
    const delta = value - startVal;
    if (delta === 0) return;

    let rafId = 0;
    const startTs = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - startTs) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(startVal + delta * eased);
      currentRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [value, durationMs, reduced]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
