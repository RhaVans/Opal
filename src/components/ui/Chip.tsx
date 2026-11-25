import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  children: ReactNode;
}

export function Chip({ selected = false, className = '', children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[
        'inline-flex items-center justify-center gap-1.5 min-h-[48px] px-4 py-2 rounded-[var(--radius-chip)] text-sm font-semibold whitespace-nowrap transition-colors',
        selected
          ? 'bg-[#1D1D1F] text-white border border-[#1D1D1F] hover:bg-[#323236]'
          : 'bg-[rgba(29,29,31,0.06)] text-[#1D1D1F] border border-[rgba(29,29,31,0.10)] hover:bg-[rgba(29,29,31,0.11)]',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
