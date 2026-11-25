'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { SemanticIcon } from '@/components/motion/SemanticIcon';

interface ArrowButtonBaseProps {
  ariaLabel: string;
  variant?: 'dark' | 'light' | 'outline';
  darkSurface?: boolean;
  className?: string;
}

interface ArrowButtonAsLink extends ArrowButtonBaseProps {
  href: string;
  onClick?: never;
  disabled?: never;
}

interface ArrowButtonAsButton extends ArrowButtonBaseProps {
  href?: never;
  onClick: () => void;
  disabled?: boolean;
}

export function ArrowButton({
  ariaLabel,
  variant = 'dark',
  darkSurface = false,
  className = '',
  href,
  onClick,
  disabled = false,
}: ArrowButtonAsLink | ArrowButtonAsButton) {
  let palette = 'bg-[#1D1D1F] text-white hover:bg-[#323236]';
  if (variant === 'light') {
    palette = 'bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]';
  } else if (variant === 'outline') {
    palette = darkSurface
      ? 'border-[1.5px] border-white/80 text-white hover:bg-white/15'
      : 'border-[1.5px] border-[#1D1D1F] text-[#1D1D1F] hover:bg-[#1D1D1F]/10';
  }

  const [nudgeTick, setNudgeTick] = useState(0);

  const classes = [
    'inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] shrink-0 disabled:opacity-40',
    palette,
    className,
  ].join(' ');

  const icon = (
    <SemanticIcon behavior="nudge-right" trigger={nudgeTick}>
      <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
    </SemanticIcon>
  );

  if (href) {
    return (
      <InteractiveSurface
        as="a"
        href={href}
        ariaLabel={ariaLabel}
        pressScale={0.94}
        onPointerDown={() => setNudgeTick((n) => n + 1)}
        className={classes}
      >
        {icon}
      </InteractiveSurface>
    );
  }

  return (
    <InteractiveSurface
      type="button"
      disabled={disabled}
      ariaLabel={ariaLabel}
      pressScale={0.94}
      onPointerDown={() => setNudgeTick((n) => n + 1)}
      onClick={onClick}
      className={classes}
    >
      {icon}
    </InteractiveSurface>
  );
}
