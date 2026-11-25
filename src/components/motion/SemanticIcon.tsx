'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useMotionMode } from './MotionProvider';
import { EASINGS, type IconBehavior } from '@/lib/motion/tokens';

interface SemanticIconProps {
  behavior: IconBehavior;
  active?: boolean;
  trigger?: number | string | boolean;
  className?: string;
  children: ReactNode;
}

export function SemanticIcon({
  behavior,
  active = false,
  trigger,
  className = '',
  children,
}: SemanticIconProps) {
  const { reduced } = useMotionMode();
  const ref = useRef<HTMLSpanElement>(null);
  const animRef = useRef<Animation | null>(null);
  const prevTriggerRef = useRef<number | string | boolean | undefined>(trigger ?? active);

  useEffect(() => {
    const key = trigger !== undefined ? trigger : active;
    if (prevTriggerRef.current === key) return;
    prevTriggerRef.current = key;

    const el = ref.current;
    if (!el || reduced || behavior === 'none' || typeof el.animate !== 'function') return;

    animRef.current?.cancel();

    if (behavior === 'nudge-right') {
      animRef.current = el.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(3.5px)' }, { transform: 'translateX(0)' }],
        { duration: 220, easing: EASINGS.standard }
      );
    } else if (behavior === 'nudge-left') {
      animRef.current = el.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-3.5px)' }, { transform: 'translateX(0)' }],
        { duration: 220, easing: EASINGS.standard }
      );
    } else if (behavior === 'pop-fill') {
      const frames = active
        ? [{ transform: 'scale(1)' }, { transform: 'scale(0.82)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }]
        : [{ transform: 'scale(0.9)' }, { transform: 'scale(1)' }];
      animRef.current = el.animate(frames, {
        duration: active ? 280 : 180,
        easing: active ? EASINGS.springSnappy : EASINGS.standard,
      });
    } else if (behavior === 'spin-cw') {
      animRef.current = el.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
        { duration: 320, easing: EASINGS.decel }
      );
    } else if (behavior === 'spin-half') {
      animRef.current = el.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }],
        { duration: 220, easing: EASINGS.standard }
      );
    } else if (behavior === 'draw-check') {
      animRef.current = el.animate(
        [{ transform: 'scale(0.85)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
        { duration: 240, easing: EASINGS.springSnappy }
      );
    } else if (behavior === 'shake-x') {
      animRef.current = el.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(-2px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 280, easing: EASINGS.standard }
      );
    } else if (behavior === 'rock-bell') {
      animRef.current = el.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(-12deg)' },
          { transform: 'rotate(12deg)' },
          { transform: 'rotate(-6deg)' },
          { transform: 'rotate(0deg)' },
        ],
        { duration: 340, easing: EASINGS.standard }
      );
    } else if (behavior === 'eye-blink') {
      animRef.current = el.animate(
        [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.15)' }, { transform: 'scaleY(1)' }],
        { duration: 200, easing: EASINGS.standard }
      );
    }
  }, [trigger, active, behavior, reduced]);

  if (behavior === 'soundwave' && active && !reduced) {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={`relative inline-flex items-center justify-center gap-[3px] h-5 ${className}`}
      >
        <span className="soundwave-ring" />
        <span className="soundwave-bar soundwave-bar-1" />
        <span className="soundwave-bar soundwave-bar-2" />
        <span className="soundwave-bar soundwave-bar-3" />
      </span>
    );
  }

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`inline-flex items-center justify-center ${className}`}
    >
      {children}
    </span>
  );
}
