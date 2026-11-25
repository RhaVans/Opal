interface RingBadgeProps {
  value: number;
  max: number;
  label?: string;
  size?: number;
  onDark?: boolean;
  trackColor?: string;
  strokeColor?: string;
}

export function RingBadge({
  value,
  max,
  label,
  size = 44,
  onDark = false,
  trackColor,
  strokeColor,
}: RingBadgeProps) {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const strokeWidth = 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  const track = trackColor ?? (onDark ? 'rgba(255,255,255,0.22)' : 'rgba(29,29,31,0.14)');
  const fill = strokeColor ?? (onDark ? '#FFFFFF' : '#4D3EA3');

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        />
      </svg>
      <span
        className={[
          'absolute text-[11px] font-bold tabular-nums',
          onDark ? 'text-white' : 'text-[#1D1D1F]',
        ].join(' ')}
      >
        {label ?? `${value}/${max}`}
      </span>
    </div>
  );
}
