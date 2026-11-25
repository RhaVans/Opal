'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, Undo2, XCircle } from 'lucide-react';
import { DRILLS_DATA } from '@/lib/curriculum';
import { useApp } from '@/components/AppProvider';
import { TrilingualBlock } from '@/components/text/TrilingualBlock';
import { Chip } from '@/components/ui/Chip';
import { Sparkle } from '@/components/ui/Sparkle';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { emitFeedback } from '@/lib/motion/feedbackBus';

interface SequenceDrillProps {
  onExit: () => void;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function SequenceDrill({ onExit }: SequenceDrillProps) {
  const { settings, saveDrillResult } = useApp();
  const datasets = DRILLS_DATA.sequences;

  const [datasetIdx, setDatasetIdx] = useState(0);
  const [seed, setSeed] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [wrongStepId, setWrongStepId] = useState<string | null>(null);
  const [completedSets, setCompletedSets] = useState<Set<string>>(() => new Set());
  const startedAtRef = useRef<number>(Date.now());

  const active = datasets[datasetIdx] ?? datasets[0];
  const orderedSteps = useMemo(
    () => [...active.steps].sort((a, b) => a.order - b.order),
    [active]
  );

  const scrambled = useMemo(() => {
    void seed;
    return shuffle(orderedSteps);
  }, [orderedSteps, seed]);

  const isDone = selectedIds.length === orderedSteps.length;

  const handleTapCard = (stepId: string) => {
    if (isDone || selectedIds.includes(stepId)) return;
    const expectedStep = orderedSteps[selectedIds.length];
    if (!expectedStep) return;

    if (stepId === expectedStep.id) {
      const next = [...selectedIds, stepId];
      setSelectedIds(next);
      setWrongStepId(null);
      emitFeedback({
        intent: 'positive',
        shaderPulse: { energy: next.length === orderedSteps.length ? 0.30 : 0.16, origin: [0.5, 0.5] },
      });

      if (next.length === orderedSteps.length) {
        const total = orderedSteps.length;
        const accuracy = Math.max(20, Math.round((total / (total + mistakes)) * 100));
        const durationSec = Math.max(5, Math.round((Date.now() - startedAtRef.current) / 1000));
        setCompletedSets((prev) => new Set(prev).add(active.id));
        void saveDrillResult('sequence', accuracy, durationSec);
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongStepId(stepId);
      emitFeedback({
        intent: 'negative',
        shaderPulse: { energy: 0.22, origin: [0.5, 0.65] },
      });
    }
  };

  const handleReset = () => {
    setSelectedIds([]);
    setMistakes(0);
    setWrongStepId(null);
    setSeed((s) => s + 1);
    startedAtRef.current = Date.now();
  };

  const handleSelectDataset = (idx: number) => {
    setDatasetIdx(idx);
    setSelectedIds([]);
    setMistakes(0);
    setWrongStepId(null);
    setSeed((s) => s + 1);
    startedAtRef.current = Date.now();
  };

  const stepProgress = orderedSteps.length
    ? Math.round((selectedIds.length / orderedSteps.length) * 100)
    : 0;

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
        <div className="flex-1">
          <div className="flex justify-between text-xs font-semibold text-[#5B5B62] mb-1 tabular-nums">
            <span>Sequence Builder</span>
            <span>
              {selectedIds.length}/{orderedSteps.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#4D3EA3] transition-all"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div
        role="group"
        aria-label="Choose sequence deck"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        {datasets.map((ds, idx) => (
          <Chip
            key={ds.id}
            selected={idx === datasetIdx}
            onClick={() => handleSelectDataset(idx)}
          >
            {ds.title.en}
            {completedSets.has(ds.id) ? ' (Done)' : ''}
          </Chip>
        ))}
      </div>

      <section className="rounded-[var(--radius-hero)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow text-[#4D3EA3]">p.{active.pdfPage}</span>
          <span className="text-xs font-semibold text-[#5B5B62] tabular-nums">
            Mistakes: {mistakes}
          </span>
        </div>
        <TrilingualBlock
          text={active.title}
          furiganaMode={settings.furiganaMode}
          langPreset={settings.langPreset}
          jaClassName="text-xl font-bold leading-[1.75]"
        />
        <p className="text-xs text-[#5B5B62]">
          Tap each step in exact textbook order from 1 to {orderedSteps.length}.
        </p>

        {/* Built sequence */}
        <ol className="space-y-2 pt-1">
          {orderedSteps.map((step, idx) => {
            const placedId = selectedIds[idx];
            const placedStep = orderedSteps.find((s) => s.id === placedId);
            return (
              <li
                key={step.id}
                className={[
                  'min-h-[48px] rounded-[var(--radius-card)] px-3.5 py-2.5 flex items-center gap-3 border',
                  placedStep
                    ? 'bg-[#E1DAFB]/65 border-[#4D3EA3]/30 text-[#1D1D1F]'
                    : 'bg-[#F5F5F7] border-dashed border-black/15 text-[#5B5B62]',
                ].join(' ')}
              >
                <span className="w-7 h-7 rounded-full bg-[#1D1D1F] text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {idx + 1}
                </span>
                {placedStep ? (
                  <div className="flex-1 min-w-0">
                    <TrilingualBlock
                      text={placedStep.text}
                      furiganaMode={settings.furiganaMode}
                      langPreset={settings.langPreset}
                      jaClassName="text-sm font-bold leading-[1.6]"
                      secondaryClassName="text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-xs font-medium">Tap step #{idx + 1} below</span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            disabled={selectedIds.length === 0 || isDone}
            onClick={() => setSelectedIds((s) => s.slice(0, -1))}
            className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-4 rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#1D1D1F] text-xs font-bold disabled:bg-[#E5E5EA] disabled:text-[#5B5B62]"
          >
            <Undo2 size={16} aria-hidden="true" />
            Undo
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-4 rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#1D1D1F] text-xs font-bold"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Reset
          </button>
        </div>
      </section>

      {wrongStepId ? (
        <div
          role="status"
          className="reveal-panel rounded-[var(--radius-card)] bg-[#CC2F52] text-white px-4 py-3 text-xs font-semibold flex items-center gap-2"
        >
          <XCircle size={18} aria-hidden="true" />
          Not the next step in order. Check step #{selectedIds.length + 1} and try again.
        </div>
      ) : null}

      {isDone ? (
        <section className="reveal-panel rounded-[var(--radius-hero)] bg-[#1D1D1F] text-white p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-[#4D3EA3] flex items-center justify-center">
              <Sparkle size={18} color="#FFFFFF" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-1.5">
                <CheckCircle2 size={18} className="text-[#1FA87A]" aria-hidden="true" />
                Sequence mastered
              </h2>
              <p className="text-xs text-[#B4B4B8] tabular-nums">
                Accuracy:{' '}
                <AnimatedNumber
                  value={Math.max(
                    20,
                    Math.round((orderedSteps.length / (orderedSteps.length + mistakes)) * 100)
                  )}
                  suffix="%"
                />{' '}
                ({mistakes} mistakes)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {datasetIdx < datasets.length - 1 ? (
              <button
                type="button"
                onClick={() => handleSelectDataset(datasetIdx + 1)}
                className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#4D3EA3] text-white text-sm font-bold active:scale-95 transition-transform"
              >
                Next Sequence
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] text-sm font-bold active:scale-95 transition-transform"
            >
              Replay
            </button>
          </div>
        </section>
      ) : (
        <section aria-label="Scrambled step cards" className="grid grid-cols-1 gap-2.5">
          {scrambled
            .filter((step) => !selectedIds.includes(step.id))
            .map((step) => {
              const isWrong = wrongStepId === step.id;
              return (
                <InteractiveSurface
                  key={step.id}
                  type="button"
                  intent={isWrong ? 'negative' : 'neutral'}
                  pressScale={0.97}
                  feedbackKey={isWrong ? `wrong:${mistakes}` : null}
                  onClick={() => handleTapCard(step.id)}
                  className={[
                    'w-full min-h-[56px] text-left rounded-[var(--radius-card)] p-4 bg-white shadow-[var(--shadow-soft)] border',
                    isWrong
                      ? 'border-[#CC2F52] bg-[#FFD2F4]/40'
                      : 'border-black/8 hover:bg-[#E1DAFB]/35',
                  ].join(' ')}
                >
                  <TrilingualBlock
                    text={step.text}
                    furiganaMode={settings.furiganaMode}
                    langPreset={settings.langPreset}
                    jaClassName="text-base font-bold leading-[1.75]"
                    secondaryClassName="text-xs"
                  />
                </InteractiveSurface>
              );
            })}
        </section>
      )}
    </div>
  );
}
