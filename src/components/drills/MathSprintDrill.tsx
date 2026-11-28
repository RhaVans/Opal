'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Delete, RotateCcw, XCircle } from 'lucide-react';
import {
  generateMathSprint,
  isNumericAnswerMatch,
  type MathProblem,
} from '@/lib/mathGenerator';
import { useApp } from '@/components/AppProvider';
import { FuriganaText } from '@/components/text/FuriganaText';
import {
  LangCycleChip,
  PeekTranslationButton,
  QuestionStudyControls,
} from '@/components/text/QuestionStudyControls';
import { Sparkle } from '@/components/ui/Sparkle';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { StateTransition } from '@/components/motion/StateTransition';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { emitFeedback } from '@/lib/motion/feedbackBus';

interface MathSprintDrillProps {
  onExit: () => void;
}

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '.'] as const;

export function MathSprintDrill({ onExit }: MathSprintDrillProps) {
  const { settings, saveDrillResult } = useApp();
  const [problems, setProblems] = useState<MathProblem[]>(() => generateMathSprint(10));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState<'correct' | 'wrong' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [peekTranslation, setPeekTranslation] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const current = problems[idx];

  const handleSubmit = useCallback(() => {
    if (!current || checked !== null || !input.trim()) return;
    const isOk = isNumericAnswerMatch(input, current.answer);
    setChecked(isOk ? 'correct' : 'wrong');
    emitFeedback({
      intent: isOk ? 'positive' : 'negative',
      shaderPulse: { energy: isOk ? 0.24 : 0.22, origin: [0.5, 0.5] },
    });
    if (isOk) {
      setCorrectCount((c) => c + 1);
    }
  }, [current, checked, input]);

  const handleNext = useCallback(() => {
    if (idx + 1 < problems.length) {
      setIdx((i) => i + 1);
      setInput('');
      setChecked(null);
      setPeekTranslation(false);
    } else {
      setFinished(true);
      const accuracy = Math.round((correctCount / problems.length) * 100);
      const durationSec = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
      void saveDrillResult('math', accuracy, durationSec);
    }
  }, [idx, problems.length, correctCount, startedAt, saveDrillResult]);

  const handleKeyPress = useCallback(
    (key: (typeof KEYPAD_KEYS)[number] | 'del') => {
      if (checked !== null) return;
      if (key === 'del') {
        setInput((v) => v.slice(0, -1));
        return;
      }
      if (key === '.') {
        if (input.includes('.')) return;
        setInput((v) => (v === '' ? '0.' : `${v}.`));
        return;
      }
      if (key === ',') {
        if (input === '' || input.endsWith(',') || input.endsWith('.')) return;
      }
      if (input.length >= 12) return;
      setInput((v) => v + key);
    },
    [checked, input]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finished) return;
      if (/^[0-9.,]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key as (typeof KEYPAD_KEYS)[number]);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('del');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (checked === null) handleSubmit();
        else handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finished, checked, handleKeyPress, handleSubmit, handleNext]);

  const handleRestart = () => {
    setProblems(generateMathSprint(10));
    setIdx(0);
    setInput('');
    setChecked(null);
    setPeekTranslation(false);
    setCorrectCount(0);
    setFinished(false);
    setStartedAt(Date.now());
  };

  const useIndonesian = settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en';
  const hideTrans = settings.hideTranslation && !peekTranslation;

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
            <span>Revenue Math Sprint</span>
            <span>
              {Math.min(idx + 1, problems.length)}/{problems.length}
            </span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {problems.map((p, i) => (
              <div
                key={p.id}
                className={[
                  'h-2 rounded-full',
                  i < idx ? 'bg-[#4D3EA3]' : i === idx ? 'bg-[#FF7A1A]' : 'bg-black/10',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
        <LangCycleChip />
      </div>

      <QuestionStudyControls />

      {finished ? (
        <section className="reveal-panel rounded-[var(--radius-hero)] bg-[#1D1D1F] text-white p-6 space-y-4">
          <div className="w-12 h-12 rounded-[var(--radius-icon)] bg-[#4D3EA3] flex items-center justify-center">
            <Sparkle size={22} color="#FFFFFF" />
          </div>
          <div>
            <span className="eyebrow text-[#B4B4B8]">10-Question Sprint</span>
            <h2 className="stat-number mt-1">
              <AnimatedNumber
                value={Math.round((correctCount / problems.length) * 100)}
                suffix="%"
              />
            </h2>
            <p className="text-sm text-[#B4B4B8] mt-1 tabular-nums">
              <AnimatedNumber value={correctCount} /> of {problems.length} solved accurately
            </p>
          </div>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] text-sm font-bold active:scale-95 transition-transform"
          >
            <RotateCcw size={16} aria-hidden="true" />
            New 10 Questions
          </button>
        </section>
      ) : current ? (
        <>
          <StateTransition keyId={current.id} direction="forward">
            <section
              data-vt-id="drill-math"
              className="rounded-[var(--radius-hero)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="eyebrow text-[#4D3EA3]">{current.formulaLabel}</span>
                <PeekTranslationButton
                  peeking={peekTranslation}
                  onToggle={() => setPeekTranslation((p) => !p)}
                />
              </div>
              <div className="text-lg font-bold text-[#1D1D1F] leading-[1.8]">
                <FuriganaText
                  jaRuby={current.prompt.jaRuby}
                  jaPlain={current.prompt.jaPlain}
                  mode={settings.furiganaMode}
                />
              </div>
              {!hideTrans && (settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en') ? (
                <p className="text-sm text-[#1D1D1F]">{current.prompt.id}</p>
              ) : null}
              {!hideTrans && (settings.langPreset === 'jp_en' || settings.langPreset === 'jp_id_en') ? (
                <p className="text-xs text-[#5B5B62]">{current.prompt.en}</p>
              ) : null}

              <InteractiveSurface
                as="div"
                intent={checked === 'correct' ? 'positive' : checked === 'wrong' ? 'negative' : 'neutral'}
                feedbackKey={checked ? `${current.id}:${checked}` : null}
                className="rounded-[var(--radius-card)] bg-[#F5F5F7] p-4 flex items-center justify-between gap-3 border border-black/10"
              >
                <span className="text-xs font-semibold text-[#5B5B62]">Your answer</span>
                <div className="text-2xl font-bold text-[#1D1D1F] tabular-nums">
                  {current.unit === '¥' ? '¥' : ''}
                  {input || '0'}
                  {current.unit === '%' ? '%' : ''}
                </div>
              </InteractiveSurface>

              {checked ? (
                <div
                  role="status"
                  className={[
                    'reveal-panel rounded-[var(--radius-card)] p-4 space-y-2',
                    checked === 'correct'
                      ? 'bg-[#1FA87A]/20 text-[#1D1D1F]'
                      : 'bg-[#FFD2F4] text-[#450C3F]',
                  ].join(' ')}
                >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {checked === 'correct' ? (
                    <>
                      <CheckCircle2 size={18} className="text-[#1D1D1F]" aria-hidden="true" />
                      Correct: {current.unit === '¥' ? `¥${current.answer.toLocaleString('en-US')}` : `${current.answer}%`}
                    </>
                  ) : (
                    <>
                      <XCircle size={18} aria-hidden="true" />
                      Expected: {current.unit === '¥' ? `¥${current.answer.toLocaleString('en-US')}` : `${current.answer}%`}
                    </>
                  )}
                </div>
                {!hideTrans
                  ? (useIndonesian ? current.steps.id : current.steps.en).map((line, i) => (
                      <p key={i} className="text-xs font-medium">
                        {line}
                      </p>
                    ))
                  : null}
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full min-h-[48px] rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-bold mt-2"
                >
                  {idx + 1 < problems.length ? 'Next Problem' : 'See Result'}
                </button>
              </div>
            ) : null}
            </section>
          </StateTransition>

          {!checked ? (
            <section
              aria-label="Numeric keypad"
              className="rounded-[var(--radius-hero)] bg-white p-3.5 shadow-[var(--shadow-soft)] space-y-2.5"
            >
              <div className="grid grid-cols-3 gap-2">
                {KEYPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={
                      key === ','
                        ? 'Comma separator or decimal'
                        : key === '.'
                          ? 'Decimal point'
                          : key
                    }
                    onClick={() => handleKeyPress(key)}
                    className="min-h-[52px] rounded-[16px] bg-[#F5F5F7] text-[#1D1D1F] text-lg font-bold tabular-nums hover:bg-[#E1DAFB] active:scale-95 transition flex items-center justify-center"
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="min-h-[52px] rounded-[16px] bg-black/8 text-[#1D1D1F] text-sm font-bold hover:bg-black/14 active:scale-95 transition"
                >
                  Clear
                </button>
                <button
                  type="button"
                  aria-label="Backspace"
                  onClick={() => handleKeyPress('del')}
                  className="min-h-[52px] rounded-[16px] bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E1DAFB] active:scale-95 transition flex items-center justify-center"
                >
                  <Delete size={20} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={!input.trim()}
                  onClick={handleSubmit}
                  className="col-span-2 min-h-[52px] rounded-[16px] bg-[#4D3EA3] text-white text-base font-bold hover:bg-[#3f328b] active:scale-[0.98] transition disabled:bg-[#E5E5EA] disabled:text-[#5B5B62]"
                >
                  Check Answer
                </button>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
