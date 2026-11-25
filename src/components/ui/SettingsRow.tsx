import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface SettingsRowProps {
  icon: ReactNode;
  label: string;
  description?: string;
  valueLabel?: string;
  control?: ReactNode;
  onClick?: () => void;
}

export function SettingsRow({
  icon,
  label,
  description,
  valueLabel,
  control,
  onClick,
}: SettingsRowProps) {
  const body = (
    <>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-[#E1DAFB] text-[#4D3EA3] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold text-[#1D1D1F]">{label}</p>
          {description ? <p className="text-xs text-[#5B5B62]">{description}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {valueLabel ? <span className="text-xs font-semibold text-[#5B5B62]">{valueLabel}</span> : null}
        {control}
        {onClick && !control ? (
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
        className="w-full min-h-[56px] px-4 py-3 rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-soft)] flex items-center justify-between gap-3 hover:bg-[#F5F5F7] transition-colors"
      >
        {body}
      </button>
    );
  }

  return (
    <div className="w-full min-h-[56px] px-4 py-3 rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-soft)] flex items-center justify-between gap-3">
      {body}
    </div>
  );
}
