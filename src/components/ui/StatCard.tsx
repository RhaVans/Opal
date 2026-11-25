import type { ReactNode } from 'react';

interface StatCardProps {
  eyebrow: string;
  value: string | number;
  sublabel?: string;
  variant?: 'light' | 'dark' | 'tone';
  toneBg?: string;
  toneText?: string;
  rightSlot?: ReactNode;
  className?: string;
}

export function StatCard({
  eyebrow,
  value,
  sublabel,
  variant = 'light',
  toneBg,
  toneText,
  rightSlot,
  className = '',
}: StatCardProps) {
  const isDark = variant === 'dark';
  const style =
    variant === 'tone' && toneBg
      ? { backgroundColor: toneBg, color: toneText ?? '#1D1D1F' }
      : undefined;

  return (
    <div
      style={style}
      className={[
        'rounded-[var(--radius-card)] p-4 flex flex-col justify-between gap-2 shadow-[var(--shadow-soft)]',
        variant === 'light' ? 'bg-white text-[#1D1D1F]' : '',
        isDark ? 'bg-[#1D1D1F] text-white' : '',
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={[
            'eyebrow',
            isDark ? 'text-[#B4B4B8]' : variant === 'tone' ? 'opacity-85' : 'text-[#5B5B62]',
          ].join(' ')}
        >
          {eyebrow}
        </span>
        {rightSlot}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="stat-number">{value}</span>
        {sublabel ? (
          <span
            className={[
              'text-xs font-medium',
              isDark ? 'text-[#B4B4B8]' : variant === 'tone' ? 'opacity-85' : 'text-[#5B5B62]',
            ].join(' ')}
          >
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
