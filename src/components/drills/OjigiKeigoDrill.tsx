'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { DRILLS_DATA } from '@/lib/curriculum';
import { useApp } from '@/components/AppProvider';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TrilingualBlock } from '@/components/text/TrilingualBlock';
import { TTSButton } from '@/components/text/TTSButton';
import { Sparkle } from '@/components/ui/Sparkle';

interface OjigiKeigoDrillProps {
  onExit: () => void;
}

type DrillMode = 'ojigi' | 'keigo';

function BowDiagram({ angle }: { angle: '15' | '30' | '45' }) {
  const deg = Number(angle);
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" aria-hidden="true" className="shrink-0">
      <line x1="18" y1="40" x2="18" y2="24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <g transform={`rotate(${deg} 18 24)`}>
        <line x1="18" y1="24" x2="18" y2="9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="18" cy="5" r="4" fill="currentColor" />
      </g>
      <text x="34" y="36" fontSize="11" fontWeight="700" fill="currentColor">
        {angle}°
      </text>
    </svg>
  );
}

export function OjigiKeigoDrill({ onExit }: OjigiKeigoDrillProps) {
  const { settings, saveDrillResult } = useApp();
  const [mode, setMode] = useState<DrillMode>('ojigi');
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const list = mode === 'ojigi' ? DRILLS_DATA.ojigiScenarios : DRILLS_DATA.keigoItems;
  const currentOjigi = mode === 'ojigi' ? DRILLS_DATA.ojigiScenarios[idx] : null;
  const currentKeigo = mode === 'keigo' ? DRILLS_DATA.keigoItems[idx] : null;

  const expected =
    mode === 'ojigi' ? currentOjigi?.angle ?? '' : currentKeigo?.category ?? '';

  const switchMode = (nextMode: DrillMode) => {
    setMode(nextMode);
    setIdx(0);
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
    setStartedAt(Date.now());
  };

  const handlePick = (choice: string) => {
    if (picked !== null) return;
    setPicked(choice);
    if (choice === expected) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (idx + 1 < list.length) {
      setIdx((i) => i + 1);
      setPicked(null);
    } else {
      setFinished(true);
      const accuracy = Math.round((correctCount / Math.max(1, list.length)) * 100);
      const durationSec = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
      void saveDrillResult('ojigi_keigo', accuracy, durationSec);
    }
  };

  const ojigiChoices = [
    { key: '15' as const, label: '会釈 (Eshaku)', sub: '15° · passing by / table' },
    { key: '30' as const, label: '敬礼 / 普通礼 (Keirei)', sub: '30° · welcoming / daily service' },
    { key: '45' as const, label: '最敬礼 (Saikeirei)', sub: '45° · miokuri / apology' },
  ];

  const keigoChoices = [
    { key: 'sonkeigo', label: '尊敬語 (Sonkeigo)', sub: 'Respectful: elevates guest' },
    { key: 'kenjougo', label: '謙譲語 (Kenjougo)', sub: 'Humble: lowers self' },
    { key: 'teineigo', label: '丁寧語 (Teineigo)', sub: 'Polite: desu / masu / o-go' },
  ];

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          aria-label="Back to drills"
          className="inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] shadow-[var(--shadow-soft)]"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <SegmentedControl<DrillMode>
          ariaLabel="Choose Ojigi or Keigo mode"
          value={mode}
          onChange={switchMode}
          options={[
            { value: 'ojigi', label: 'Ojigi 15/30/45' },
            { value: 'keigo', label: 'Keigo Sorter' },
          ]}
        />
      </div>

      {finished ? (
        <section className="rounded-[var(--radius-hero)] bg-[#1D1D1F] text-white p-6 space-y-4">
          <div className="w-12 h-12 rounded-[var(--radius-icon)] bg-[#4D3EA3] flex items-center justify-center">
            <Sparkle size={22} color="#FFFFFF" />
          </div>
          <h2 className="stat-number">{Math.round((correctCount / list.length) * 100)}%</h2>
          <p className="text-sm text-[#B4B4B8] tabular-nums">
            {correctCount} of {list.length} classified accurately
          </p>
          <button
            type="button"
            onClick={() => switchMode(mode)}
            className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] text-sm font-bold"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Retry Mode
          </button>
        </section>
      ) : (
        <section className="rounded-[var(--radius-hero)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-[#4D3EA3]">
              Item {idx + 1}/{list.length} · p.
              {mode === 'ojigi' ? currentOjigi?.pdfPage : currentKeigo?.pdfPage}
            </span>
            <TTSButton
              text={
                mode === 'ojigi'
                  ? currentOjigi?.scenario.jaPlain ?? ''
                  : currentKeigo?.phrase.jaPlain ?? ''
              }
            />
          </div>

          {mode === 'ojigi' && currentOjigi ? (
            <TrilingualBlock
              text={currentOjigi.scenario}
              furiganaMode={settings.furiganaMode}
              langPreset={settings.langPreset}
              jaClassName="text-xl font-bold leading-[1.8]"
            />
          ) : currentKeigo ? (
            <TrilingualBlock
              text={currentKeigo.phrase}
              furiganaMode={settings.furiganaMode}
              langPreset={settings.langPreset}
              jaClassName="text-2xl font-bold leading-[1.8]"
            />
          ) : null}

          <div className="space-y-2.5 pt-1">
            {(mode === 'ojigi' ? ojigiChoices : keigoChoices).map((choice) => {
              const isPicked = picked === choice.key;
              const isCorrect = choice.key === expected;
              let classes = 'bg-[#F5F5F7] text-[#1D1D1F] border-black/10 hover:bg-[#E1DAFB]/45';
              let subTextClass = 'text-xs text-[#5B5B62]';
              if (picked !== null) {
                if (isCorrect) {
                  classes = 'bg-[#1FA87A] text-[#1D1D1F] border-[#1FA87A]';
                  subTextClass = 'text-xs text-[#1D1D1F]';
                } else if (isPicked) {
                  classes = 'bg-[#CC2F52] text-white border-[#CC2F52]';
                  subTextClass = 'text-xs text-white';
                }
              }

              return (
                <button
                  key={choice.key}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => handlePick(choice.key)}
                  className={`w-full min-h-[60px] px-4 py-3 rounded-[var(--radius-card)] border flex items-center justify-between gap-3 text-left transition ${classes}`}
                >
                  <div>
                    <p className="text-sm font-bold">{choice.label}</p>
                    <p className={subTextClass}>{choice.sub}</p>
                  </div>
                  {mode === 'ojigi' ? (
                    <BowDiagram angle={choice.key as '15' | '30' | '45'} />
                  ) : null}
                </button>
              );
            })}
          </div>

          {picked !== null ? (
            <div className="rounded-[var(--radius-card)] bg-[#E1DAFB]/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1D1D1F]">
                {picked === expected ? (
                  <>
                    <CheckCircle2 size={18} className="text-[#1FA87A]" aria-hidden="true" />
                    Correct
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-[#CC2F52]" aria-hidden="true" />
                    Check classification
                  </>
                )}
              </div>
              {currentKeigo ? (
                <p className="text-xs text-[#1D1D1F]">
                  {settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en'
                    ? currentKeigo.note.id
                    : currentKeigo.note.en}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleNext}
                className="w-full min-h-[48px] rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-bold mt-2"
              >
                {idx + 1 < list.length ? 'Next' : 'Finish'}
              </button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
