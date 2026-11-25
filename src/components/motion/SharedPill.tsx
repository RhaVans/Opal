'use client';

import { useLayoutEffect, useRef } from 'react';
import { useMotionMode } from './MotionProvider';
import { DURATIONS, EASINGS } from '@/lib/motion/tokens';

interface SharedPillProps {
  groupId: string;
  active: boolean;
  className?: string;
}

const lastRectByGroup = new Map<string, DOMRect>();

/**
 * FLIP sliding active indicator across sibling tabs, filter chips, or routes.
 */
export function SharedPill({ groupId, active, className = '' }: SharedPillProps) {
  const { reduced } = useMotionMode();
  const pillRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    if (!active) return;
    const el = pillRef.current;
    if (!el) return;

    const currentRect = el.getBoundingClientRect();
    const prevRect = lastRectByGroup.get(groupId);
    lastRectByGroup.set(groupId, currentRect);

    if (
      reduced ||
      !prevRect ||
      prevRect.width === 0 ||
      currentRect.width === 0 ||
      typeof el.animate !== 'function'
    ) {
      return;
    }

    const dx = prevRect.left - currentRect.left;
    const dy = prevRect.top - currentRect.top;
    const sx = prevRect.width / currentRect.width;
    const sy = prevRect.height / currentRect.height;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.02) {
      return;
    }

    animRef.current?.cancel();
    el.style.transformOrigin = 'top left';
    animRef.current = el.animate(
      [
        {
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`,
        },
        {
          transform: 'translate3d(0, 0, 0) scale(1, 1)',
        },
      ],
      {
        duration: DURATIONS.standard,
        easing: EASINGS.standard,
      }
    );
  }, [active, groupId, reduced]);

  if (!active) return null;

  return (
    <span
      ref={pillRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
    />
  );
}
