'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Chip } from '@/components/ui/Chip';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import type { FuriganaMode, LangPreset } from '@/lib/types';

export const LANG_ORDER: LangPreset[] = ['jp_id', 'jp_en', 'jp_id_en', 'jp_only'];
export const LANG_LABEL: Record<LangPreset, string> = {
  jp_id: 'JP+ID',
  jp_en: 'JP+EN',
  jp_id_en: 'JP+ID+EN',
  jp_only: 'JP',
};

interface LangCycleChipProps {
  className?: string;
}

export function LangCycleChip({ className = '' }: LangCycleChipProps) {
  const { settings, updateSettings } = useApp();

  const cycleLangPreset = () => {
    const idx = LANG_ORDER.indexOf(settings.langPreset);
    const next = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
    void updateSettings({ langPreset: next });
  };

  return (
    <Chip
      onClick={cycleLangPreset}
      aria-label={`Switch language preset, current ${LANG_LABEL[settings.langPreset]}`}
      className={[settings.hideTranslation ? 'opacity-70' : '', className].join(' ')}
    >
      {LANG_LABEL[settings.langPreset]}
    </Chip>
  );
}

interface QuestionStudyControlsProps {
  showLangCycle?: boolean;
  className?: string;
}

export function QuestionStudyControls({
  showLangCycle = false,
  className = '',
}: QuestionStudyControlsProps) {
  const { settings, updateSettings } = useApp();

  return (
    <div
      role="group"
      aria-label="Reading and translation controls"
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      <SegmentedControl<FuriganaMode>
        ariaLabel="Furigana display mode"
        value={settings.furiganaMode}
        onChange={(furiganaMode) => void updateSettings({ furiganaMode })}
        options={[
          { value: 'on', label: 'On' },
          { value: 'peek', label: 'Peek' },
          { value: 'off', label: 'Off' },
        ]}
      />

      <InteractiveSurface
        type="button"
        intent={settings.hideTranslation ? 'primary' : 'neutral'}
        pressScale={0.96}
        ariaPressed={settings.hideTranslation}
        ariaLabel={
          settings.hideTranslation
            ? 'Show translations (currently hidden)'
            : 'Hide translation for Japanese immersion'
        }
        onClick={() => void updateSettings({ hideTranslation: !settings.hideTranslation })}
        className={[
          'inline-flex items-center justify-center gap-1.5 min-w-[48px] min-h-[48px] px-3.5 rounded-[var(--radius-chip)] text-xs sm:text-sm font-semibold whitespace-nowrap border',
          settings.hideTranslation
            ? 'bg-[#1D1D1F] text-white border-[#1D1D1F]'
            : 'bg-white text-[#1D1D1F] border-black/12 shadow-[var(--shadow-soft)] hover:bg-[#F5F5F7]',
        ].join(' ')}
      >
        <EyeOff size={15} aria-hidden="true" />
        <span>Hide Translation</span>
      </InteractiveSurface>

      {showLangCycle ? <LangCycleChip /> : null}
    </div>
  );
}

interface PeekTranslationButtonProps {
  peeking: boolean;
  onToggle: () => void;
  darkSurface?: boolean;
  className?: string;
}

export function PeekTranslationButton({
  peeking,
  onToggle,
  darkSurface = false,
  className = '',
}: PeekTranslationButtonProps) {
  const { settings } = useApp();
  if (!settings.hideTranslation) return null;

  return (
    <InteractiveSurface
      type="button"
      intent="neutral"
      pressScale={0.96}
      ariaPressed={peeking}
      onClick={onToggle}
      className={[
        'inline-flex items-center justify-center gap-1.5 min-w-[48px] min-h-[48px] px-3 rounded-[var(--radius-chip)] text-xs font-bold whitespace-nowrap transition-colors',
        peeking
          ? darkSurface
            ? 'bg-[#FFD2F4] text-[#450C3F]'
            : 'bg-[#1D1D1F] text-white'
          : darkSurface
            ? 'bg-white/14 text-white hover:bg-white/22'
            : 'bg-[#E1DAFB] text-[#450C3F] hover:bg-[#E1DAFB]/80',
        className,
      ].join(' ')}
    >
      {peeking ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
      <span>{peeking ? 'Hide peek' : 'Peek translation'}</span>
    </InteractiveSurface>
  );
}
