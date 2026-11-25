'use client';

import type { FuriganaMode, LangPreset, TrilingualText } from '@/lib/types';
import { FuriganaText } from './FuriganaText';

interface TrilingualBlockProps {
  text: TrilingualText;
  furiganaMode: FuriganaMode;
  langPreset: LangPreset;
  darkSurface?: boolean;
  jaClassName?: string;
  secondaryClassName?: string;
}

export function TrilingualBlock({
  text,
  furiganaMode,
  langPreset,
  darkSurface = false,
  jaClassName = 'text-lg font-bold leading-[1.85]',
  secondaryClassName = 'text-sm leading-relaxed',
}: TrilingualBlockProps) {
  const showId = langPreset === 'jp_id' || langPreset === 'jp_id_en';
  const showEn = langPreset === 'jp_en' || langPreset === 'jp_id_en';
  const subColor = darkSurface ? 'text-[#B4B4B8]' : 'text-[#5B5B62]';

  return (
    <div className="space-y-2">
      <div className={jaClassName}>
        <FuriganaText
          jaRuby={text.jaRuby}
          jaPlain={text.jaPlain}
          mode={furiganaMode}
          darkSurface={darkSurface}
        />
      </div>
      {showId ? (
        <p lang="id" className={`${secondaryClassName} ${darkSurface ? 'text-white' : 'text-[#1D1D1F]'}`}>
          {text.id}
        </p>
      ) : null}
      {showEn ? (
        <p lang="en" className={`${secondaryClassName} ${subColor}`}>
          {text.en}
        </p>
      ) : null}
    </div>
  );
}
