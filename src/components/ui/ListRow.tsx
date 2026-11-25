import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface ListRowProps {
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
  meta: string;
  rightValue: string;
  badge?: ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
}

export function ListRow({
  eyebrow,
  eyebrowColor = '#4D3EA3',
  title,
  meta,
  rightValue,
  badge,
  onClick,
  showChevron = false,
}: ListRowProps) {
  const inner = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <span className="eyebrow block" style={{ color: eyebrowColor }}>
          {eyebrow}
        </span>
        <p className="text-base font-bold text-[#1D1D1F] truncate mt-0.5">{title}</p>
        <p className="text-xs text-[#5B5B62] mt-0.5 truncate">{meta}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge}
        <span className="text-base font-bold text-[#1D1D1F] tabular-nums">{rightValue}</span>
        {showChevron ? (
          <ChevronRight size={18} className="text-[#5B5B62]" aria-hidden="true" />
        ) : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full min-h-[64px] px-4 py-3 rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-soft)] flex items-center justify-between gap-3 hover:bg-[#F5F5F7] transition-colors"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="w-full min-h-[64px] px-4 py-3 rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-soft)] flex items-center justify-between gap-3">
      {inner}
    </div>
  );
}
