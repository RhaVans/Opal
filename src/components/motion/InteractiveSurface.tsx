'use client';

import Link from 'next/link';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react';
import { useMotionMode } from './MotionProvider';
import {
  DURATIONS,
  EASINGS,
  INTENT_FLASH_STYLES,
  type InteractionIntent,
} from '@/lib/motion/tokens';
import { emitFeedback } from '@/lib/motion/feedbackBus';

interface InteractiveSurfaceProps {
  as?: 'button' | 'div' | 'a';
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  intent?: InteractionIntent;
  pressScale?: number;
  feedbackKey?: number | string | null;
  emitAmbientPulse?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLElement>;
  onPointerDown?: PointerEventHandler<HTMLElement>;
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaCurrent?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false' | boolean;
  children: ReactNode;
}

export function InteractiveSurface({
  as = 'button',
  href,
  type = 'button',
  intent = 'neutral',
  pressScale = 0.96,
  feedbackKey,
  emitAmbientPulse = false,
  disabled = false,
  className = '',
  style,
  onClick,
  onPointerDown,
  ariaLabel,
  ariaPressed,
  ariaCurrent,
  children,
}: InteractiveSurfaceProps) {
  const { reduced } = useMotionMode();
  const hostRef = useRef<HTMLElement | null>(null);
  const flashRef = useRef<HTMLSpanElement>(null);
  const flashAnimRef = useRef<Animation | null>(null);
  const shakeAnimRef = useRef<Animation | null>(null);
  const prevFeedbackRef = useRef<number | string | null | undefined>(feedbackKey);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (feedbackKey === undefined || feedbackKey === null || feedbackKey === 0) {
      prevFeedbackRef.current = feedbackKey;
      return;
    }
    if (prevFeedbackRef.current === feedbackKey) return;
    prevFeedbackRef.current = feedbackKey;

    const host = hostRef.current;
    const flash = flashRef.current;
    const palette = INTENT_FLASH_STYLES[intent];

    if (flash && typeof flash.animate === 'function') {
      flashAnimRef.current?.cancel();
      flash.style.borderColor = palette.border;
      flash.style.backgroundColor = palette.wash;
      flashAnimRef.current = flash.animate(
        [
          { opacity: 0 },
          { opacity: 1, offset: 0.14 },
          { opacity: 0.9, offset: 0.34 },
          { opacity: 0 },
        ],
        {
          duration: DURATIONS.decay,
          easing: EASINGS.flash,
          fill: 'forwards',
        }
      );
    }

    if (!reduced && host && typeof host.animate === 'function') {
      if (intent === 'negative') {
        shakeAnimRef.current?.cancel();
        shakeAnimRef.current = host.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(3px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 300, easing: EASINGS.standard }
        );
      } else if (intent === 'positive') {
        shakeAnimRef.current?.cancel();
        shakeAnimRef.current = host.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.02)' },
            { transform: 'scale(1)' },
          ],
          { duration: 240, easing: EASINGS.standard }
        );
      }
    }

    if (emitAmbientPulse && !reduced && host && typeof window !== 'undefined') {
      const rect = host.getBoundingClientRect();
      const ox = (rect.left + rect.width * 0.5) / Math.max(window.innerWidth, 1);
      const oy = 1.0 - (rect.top + rect.height * 0.5) / Math.max(window.innerHeight, 1);
      emitFeedback({
        intent,
        shaderPulse: {
          energy: intent === 'accent' ? 0.32 : 0.22,
          origin: [ox, oy],
        },
      });
    }
  }, [feedbackKey, intent, emitAmbientPulse, reduced]);

  const handlePointerDown: PointerEventHandler<HTMLElement> = (e) => {
    if (!disabled) {
      setPressed(true);
    }
    onPointerDown?.(e);
  };

  const handlePointerRelease = () => {
    if (pressed) setPressed(false);
  };

  const dynamicStyle: CSSProperties = {
    ...style,
    transform:
      pressed && !disabled && !reduced ? `scale(${pressScale})` : style?.transform,
    opacity: pressed && !disabled && reduced ? 0.85 : style?.opacity,
    transitionProperty: reduced ? 'opacity, background-color, border-color' : 'transform, opacity, background-color, border-color, box-shadow',
    transitionDuration: `${pressed ? DURATIONS.instant : DURATIONS.micro}ms`,
    transitionTimingFunction: reduced ? 'ease-out' : EASINGS.springSnappy,
  };

  const sharedClasses = ['relative overflow-hidden', className].filter(Boolean).join(' ');

  const overlay = (
    <span
      ref={flashRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 opacity-0"
    />
  );

  if (as === 'a' && href) {
    return (
      <Link
        ref={(el) => {
          hostRef.current = el;
        }}
        href={href}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
        onClick={onClick as MouseEventHandler<HTMLAnchorElement> | undefined}
        onPointerDown={handlePointerDown as PointerEventHandler<HTMLAnchorElement>}
        onPointerUp={handlePointerRelease}
        onPointerCancel={handlePointerRelease}
        onPointerLeave={handlePointerRelease}
        style={dynamicStyle}
        className={sharedClasses}
      >
        {children}
        {overlay}
      </Link>
    );
  }

  if (as === 'div') {
    return (
      <div
        ref={(el) => {
          hostRef.current = el;
        }}
        aria-label={ariaLabel}
        onClick={onClick as MouseEventHandler<HTMLDivElement> | undefined}
        onPointerDown={handlePointerDown as PointerEventHandler<HTMLDivElement>}
        onPointerUp={handlePointerRelease}
        onPointerCancel={handlePointerRelease}
        onPointerLeave={handlePointerRelease}
        style={dynamicStyle}
        className={sharedClasses}
      >
        {children}
        {overlay}
      </div>
    );
  }

  return (
    <button
      ref={(el) => {
        hostRef.current = el;
      }}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-current={ariaCurrent}
      onClick={onClick as MouseEventHandler<HTMLButtonElement> | undefined}
      onPointerDown={handlePointerDown as PointerEventHandler<HTMLButtonElement>}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      onPointerLeave={handlePointerRelease}
      style={dynamicStyle}
      className={sharedClasses}
    >
      {children}
      {overlay}
    </button>
  );
}
