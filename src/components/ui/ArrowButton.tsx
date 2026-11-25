import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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

  const classes = [
    'inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] shrink-0 transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100',
    palette,
    className,
  ].join(' ');

  const icon = <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />;

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={classes}>
        {icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      className={classes}
    >
      {icon}
    </button>
  );
}
