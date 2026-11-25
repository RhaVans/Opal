'use client';

import { useState } from 'react';
import { useMotionMode } from '@/components/motion/MotionProvider';
import type { FuriganaMode } from '@/lib/types';
import { parseRubyTokens } from '@/lib/furigana';

interface FuriganaTextProps {
  jaRuby: string;
  jaPlain: string;
  mode: FuriganaMode;
  darkSurface?: boolean;
  rtColor?: string;
  className?: string;
}

export function FuriganaText({
  jaRuby,
  jaPlain,
  mode,
  darkSurface = false,
  rtColor,
  className = '',
}: FuriganaTextProps) {
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(() => new Set());
  const { reduced } = useMotionMode();

  if (mode === 'off') {
    return (
      <span lang="ja" className={className}>
        {jaPlain}
      </span>
    );
  }

  const tokens = parseRubyTokens(jaRuby);
  const rtClass = darkSurface ? 'text-[#B4B4B8]' : 'text-[#5B5B62]';
  const rtStyle = rtColor ? { color: rtColor } : undefined;

  const toggleIndex = (idx: number) => {
    setRevealedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <span lang="ja" className={className}>
      {tokens.map((tok, idx) => {
        if (tok.type === 'text') {
          return <span key={idx}>{tok.text}</span>;
        }
        if (mode === 'on') {
          return (
            <ruby key={idx}>
              {tok.base}
              <rt className={rtColor ? undefined : rtClass} style={rtStyle}>
                {tok.reading}
              </rt>
            </ruby>
          );
        }
        const isShown = revealedIndices.has(idx);
        return (
          <button
            key={idx}
            type="button"
            data-peek-word="true"
            aria-pressed={isShown}
            aria-label={`${tok.base}: ${isShown ? tok.reading : 'tap to peek furigana'}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleIndex(idx);
            }}
            className={[
              'inline-flex items-center justify-center min-w-[48px] min-h-[48px] px-1.5 mx-0.5 rounded-xl align-baseline transition-[colors,transform] active:scale-95',
              darkSurface
                ? 'hover:bg-white/10 focus-visible:outline-white'
                : 'hover:bg-black/5',
              isShown
                ? darkSurface
                  ? 'bg-white/12'
                  : 'bg-[#E1DAFB]/65'
                : 'border border-dashed border-current/25',
            ].join(' ')}
          >
            <ruby>
              {tok.base}
              <rt
                className={rtColor ? undefined : rtClass}
                style={{
                  ...rtStyle,
                  opacity: isShown ? 1 : 0,
                  filter: reduced || isShown ? 'none' : 'blur(3px)',
                  transform: reduced ? undefined : isShown ? 'translateY(0)' : 'translateY(2px)',
                }}
              >
                {tok.reading}
              </rt>
            </ruby>
          </button>
        );
      })}
    </span>
  );
}
