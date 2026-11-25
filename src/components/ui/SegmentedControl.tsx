'use client';

import { useId } from 'react';
import { SharedPill } from '@/components/motion/SharedPill';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  ariaLabel: string;
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (next: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  const pillGroupId = useId();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={[
        'inline-flex items-center p-1 rounded-[var(--radius-chip)] bg-[rgba(29,29,31,0.06)] border border-[rgba(29,29,31,0.10)]',
        className,
      ].join(' ')}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <InteractiveSurface
            key={opt.value}
            type="button"
            pressScale={0.96}
            ariaPressed={active}
            onClick={() => onChange(opt.value)}
            className={[
              'shrink-0 inline-flex items-center justify-center min-w-[48px] min-h-[48px] px-3.5 rounded-[var(--radius-chip)] text-xs sm:text-sm font-semibold whitespace-nowrap',
              active
                ? 'text-white'
                : 'text-[#1D1D1F] hover:bg-[rgba(29,29,31,0.06)]',
            ].join(' ')}
          >
            <SharedPill groupId={pillGroupId} active={active} className="bg-[#1D1D1F] shadow-sm" />
            <span className="relative z-10">{opt.label}</span>
          </InteractiveSurface>
        );
      })}
    </div>
  );
}
