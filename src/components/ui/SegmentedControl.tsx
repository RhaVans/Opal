'use client';

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
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={[
              'min-w-[48px] min-h-[48px] px-3.5 rounded-[var(--radius-chip)] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap',
              active
                ? 'bg-[#1D1D1F] text-white shadow-sm'
                : 'text-[#1D1D1F] hover:bg-[rgba(29,29,31,0.06)]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
