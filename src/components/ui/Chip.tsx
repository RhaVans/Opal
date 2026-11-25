'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { SharedPill } from '@/components/motion/SharedPill';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  pillGroupId?: string;
  children: ReactNode;
}

export function Chip({
  selected = false,
  pillGroupId,
  className = '',
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[
        'relative overflow-hidden shrink-0 inline-flex items-center justify-center gap-1.5 min-w-[48px] min-h-[48px] px-4 py-2 rounded-[var(--radius-chip)] text-sm font-semibold whitespace-nowrap transition-[transform,colors] active:scale-95',
        pillGroupId && selected
          ? 'text-white border border-[#1D1D1F]'
          : selected
            ? 'bg-[#1D1D1F] text-white border border-[#1D1D1F] hover:bg-[#323236]'
            : 'bg-[rgba(29,29,31,0.06)] text-[#1D1D1F] border border-[rgba(29,29,31,0.10)] hover:bg-[rgba(29,29,31,0.11)]',
        className,
      ].join(' ')}
      {...rest}
    >
      {pillGroupId && (
        <SharedPill groupId={pillGroupId} active={selected} className="bg-[#1D1D1F]" />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}
