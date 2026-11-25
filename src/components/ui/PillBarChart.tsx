export interface PillBarDatum {
  key: string;
  label: string;
  value: number;
  highlight?: boolean;
}

interface PillBarChartProps {
  data: PillBarDatum[];
  ariaLabel: string;
}

export function PillBarChart({ data, ariaLabel }: PillBarChartProps) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <div className="grid grid-cols-7 gap-2 items-end h-40 pt-6">
        {data.map((item) => {
          const heightPct = item.value === 0 ? 0 : Math.max(14, Math.round((item.value / maxValue) * 100));
          return (
            <div key={item.key} className="flex flex-col items-center gap-1.5 h-full">
              <span className="text-xs font-semibold tabular-nums text-[#1D1D1F]">
                {item.value}
              </span>
              <div className="relative w-full max-w-[34px] flex-1 rounded-full bg-[rgba(77,62,163,0.12)] overflow-hidden flex items-end">
                <div
                  className="w-full rounded-full transition-all"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: item.highlight ? 'var(--color-accent-warm)' : 'var(--color-persian-blue)',
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-[#5B5B62]">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
