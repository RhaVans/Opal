interface SparkleProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Sparkle({ size = 20, color = 'currentColor', className = '' }: SparkleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      className={className}
    >
      <path d="M12 1.5C13.3 7.2 16.8 10.7 22.5 12C16.8 13.3 13.3 16.8 12 22.5C10.7 16.8 7.2 13.3 1.5 12C7.2 10.7 10.7 7.2 12 1.5Z" />
    </svg>
  );
}
