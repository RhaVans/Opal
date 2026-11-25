'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useMotionMode } from './MotionProvider';
import { DURATIONS, EASINGS } from '@/lib/motion/tokens';

interface StateTransitionProps {
  keyId: string | number;
  direction?: 'forward' | 'backward' | 'up';
  className?: string;
  children: ReactNode;
}

export function StateTransition({
  keyId,
  direction = 'forward',
  className = '',
  children,
}: StateTransitionProps) {
  const { reduced } = useMotionMode();
  const ref = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const prevKeyRef = useRef<string | number>(keyId);

  useLayoutEffect(() => {
    if (prevKeyRef.current === keyId) return;
    prevKeyRef.current = keyId;

    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return;

    animRef.current?.cancel();
    if (reduced) {
      animRef.current = el.animate(
        [{ opacity: 0.35 }, { opacity: 1 }],
        { duration: 150, easing: 'ease-out' }
      );
      return;
    }

    const fromTransform =
      direction === 'up'
        ? 'translate3d(0, 12px, 0)'
        : direction === 'backward'
          ? 'translate3d(-12px, 0, 0)'
          : 'translate3d(12px, 0, 0)';

    animRef.current = el.animate(
      [
        { opacity: 0, transform: fromTransform },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      {
        duration: DURATIONS.standard,
        easing: EASINGS.standard,
      }
    );
  }, [keyId, direction, reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
