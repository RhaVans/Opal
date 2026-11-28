'use client';

import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { FuriganaText } from '@/components/text/FuriganaText';
import { PeekTranslationButton } from '@/components/text/QuestionStudyControls';
import { TTSButton } from '@/components/text/TTSButton';
import { Sparkle } from '@/components/ui/Sparkle';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { StateTransition } from '@/components/motion/StateTransition';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { emitFeedback } from '@/lib/motion/feedbackBus';
import {
  buildKotobaQuiz,
  KOTOBA_CATEGORY_LABELS,
} from '@/lib/kotoba';
import type { KotobaCardItem, KotobaFrontMode } from '@/lib/types';

interface KotobaQuickQuizProps {
  pool: KotobaCardItem[];
  allCards: KotobaCardItem[];
  frontMode: KotobaFrontMode;
  onFinishQuiz: (accuracyPct: number, durationSec: number) => void;
}

export function KotobaQuickQuiz({
  pool,
  allCards,
  frontMode,
  onFinishQuiz,
}: KotobaQuickQuizProps) {
  const { settings } = useApp();
  const [quizSeed, setQuizSeed] = useState(0);
  const [idx, setIdx] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [peekTranslation, setPeekTranslation] = useState(false);
  const [results, setResults] = useState<Array<{ card: KotobaCardItem; correct: boolean }>>([]);
  const [finished, setFinished] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  const questions = useMemo(() => {
    void quizSeed;
    return buildKotobaQuiz(pool, allCards, 10);
  }, [pool, allCards, quizSeed]);

  const current = questions[idx];
  const hideTrans = settings.hideTranslation && !peekTranslation;

  const getMeaningLabel = (card: KotobaCardItem) => {
    if (settings.langPreset === 'jp_en') return card.word.en;
    if (settings.langPreset === 'jp_id_en') return `${card.word.id} / ${card.word.en}`;
    return card.word.id;
  };

  const handleRestart = () => {
    setQuizSeed((s) => s + 1);
    setIdx(0);
    setPickedId(null);
    setPeekTranslation(false);
    setResults([]);
    setFinished(false);
    startedAtRef.current = Date.now();
  };

  const handlePick = (optId: string) => {
    if (!current || pickedId !== null) return;
    setPickedId(optId);
    const ok = optId === current.target.id;
    emitFeedback({
      intent: ok ? 'positive' : 'negative',
      shaderPulse: { energy: ok ? 0.24 : 0.22, origin: [0.5, 0.5] },
    });
    setResults((prev) => [...prev, { card: current.target, correct: ok }]);
  };

  const handleNext = () => {
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
      setPickedId(null);
      setPeekTranslation(false);
    } else {
      setFinished(true);
      const correctCount = results.filter((r) => r.correct).length;
      const accuracy = Math.round((correctCount / Math.max(1, questions.length)) * 100);
      const durationSec = Math.max(5, Math.round((Date.now() - startedAtRef.current) / 1000));
      onFinishQuiz(accuracy, durationSec);
    }
  };

  if (questions.length === 0) {
    return (
      <section className="rounded-[var(--radius-hero)] bg-white p-6 text-center shadow-[var(--shadow-soft)] space-y-2">
        <p className="text-base font-bold text-[#1D1D1F]">No items in filtered deck</p>
        <p className="text-xs text-[#5B5B62]">Reset filters to start a 10-item Quick Quiz.</p>
      </section>
    );
  }

  if (finished) {
    const correctCount = results.filter((r) => r.correct).length;
    const missed = results.filter((r) => !r.correct).map((r) => r.card);
    const pct = Math.round((correctCount / Math.max(1, questions.length)) * 100);

    return (
      <section className="reveal-panel rounded-[var(--radius-hero)] bg-[#1D1D1F] text-white p-6 space-y-4">
        <div className="w-12 h-12 rounded-[var(--radius-icon)] bg-[#4D3EA3] flex items-center justify-center">
          <Sparkle size={22} color="#FFFFFF" />
        </div>
        <div>
          <span className="eyebrow text-[#B4B4B8]">Kotoba Quick Quiz</span>
          <h2 className="stat-number mt-1">
            <AnimatedNumber value={pct} suffix="%" />
          </h2>
          <p className="text-sm text-[#B4B4B8] mt-1 tabular-nums">
            {correctCount} of {questions.length} correct
          </p>
        </div>

        {missed.length > 0 ? (
          <div className="rounded-[var(--radius-card)] bg-white/10 p-3.5 space-y-2">
            <p className="eyebrow text-[#FFD2F4]">Review Missed ({missed.length})</p>
            <ul className="space-y-1.5 text-xs">
              {missed.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span lang="ja" className="font-bold text-white">
                    {m.word.jaPlain} ({m.readingKana})
                  </span>
                  <span className="text-[#B4B4B8] text-right truncate">{getMeaningLabel(m)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleRestart}
          className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] text-sm font-bold active:scale-95 transition-transform"
        >
          <RotateCcw size={16} aria-hidden="true" />
          New Quick Quiz
        </button>
      </section>
    );
  }

  return (
    <StateTransition keyId={current.target.id} direction="forward">
      <article className="rounded-[var(--radius-hero)] bg-white p-5 shadow-[var(--shadow-medium)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="eyebrow text-[#4D3EA3] tabular-nums">
            Quiz {idx + 1}/{questions.length} · {KOTOBA_CATEGORY_LABELS[current.target.category]} · p.{current.target.pdfPage}
          </span>
          <div className="flex items-center gap-2">
            <PeekTranslationButton
              peeking={peekTranslation}
              onToggle={() => setPeekTranslation((p) => !p)}
            />
            {frontMode !== 'meaning_to_jp' || pickedId !== null ? (
              <TTSButton text={current.target.ttsText} ariaLabel="Listen to Kotoba audio" />
            ) : null}
          </div>
        </div>

        <div className="py-1 space-y-1.5">
          {frontMode === 'jp_to_meaning' ? (
            <div className="text-2xl font-bold text-[#1D1D1F] leading-[1.75]">
              <FuriganaText
                jaRuby={current.target.word.jaRuby}
                jaPlain={current.target.word.jaPlain}
                mode={settings.furiganaMode}
              />
            </div>
          ) : frontMode === 'kana_to_kanji' ? (
            <p lang="ja" className="text-2xl font-bold text-[#1D1D1F] leading-[1.75]">
              {current.target.readingKana}
            </p>
          ) : (
            <p className="text-xl font-bold text-[#1D1D1F] leading-snug">
              {getMeaningLabel(current.target)}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {current.options.map((opt, optIdx) => {
            const letter = ['A', 'B', 'C', 'D'][optIdx];
            const isPicked = pickedId === opt.id;
            const isCorrect = opt.id === current.target.id;

            let style = 'bg-[#F5F5F7] text-[#1D1D1F] border-black/10 hover:bg-[#E1DAFB]/45';
            let badgeStyle = 'bg-white text-[#1D1D1F]';
            if (pickedId !== null) {
              if (isCorrect) {
                style = 'bg-[#1FA87A] text-[#1D1D1F] border-[#1FA87A]';
                badgeStyle = 'bg-[#1D1D1F] text-white';
              } else if (isPicked) {
                style = 'bg-[#CC2F52] text-white border-[#CC2F52]';
                badgeStyle = 'bg-white text-[#CC2F52]';
              }
            }

            const showOptDark = Boolean(pickedId !== null && isPicked && !isCorrect);

            return (
              <InteractiveSurface
                key={opt.id}
                type="button"
                disabled={pickedId !== null}
                intent={pickedId ? (isCorrect ? 'positive' : isPicked ? 'negative' : 'neutral') : 'neutral'}
                pressScale={0.98}
                feedbackKey={pickedId ? `${current.target.id}:${opt.id}:${pickedId}` : null}
                onClick={() => handlePick(opt.id)}
                className={`w-full min-h-[56px] p-3.5 rounded-[var(--radius-card)] border flex items-center gap-3 text-left ${style}`}
              >
                <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${badgeStyle}`}>
                  {letter}
                </span>
                <div className="flex-1 min-w-0">
                  {frontMode === 'jp_to_meaning' ? (
                    <span className="text-sm font-bold leading-snug block">
                      {getMeaningLabel(opt)}
                    </span>
                  ) : (
                    <>
                      <span className="block text-base font-bold leading-[1.65]">
                        <FuriganaText
                          jaRuby={opt.word.jaRuby}
                          jaPlain={opt.word.jaPlain}
                          mode={frontMode === 'kana_to_kanji' ? 'off' : settings.furiganaMode}
                          darkSurface={showOptDark}
                          interactivePeek={false}
                        />
                      </span>
                      {!hideTrans && frontMode === 'kana_to_kanji' ? (
                        <span className={`block text-xs ${showOptDark ? 'text-white/90' : 'text-[#5B5B62]'}`}>
                          {getMeaningLabel(opt)}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </InteractiveSurface>
            );
          })}
        </div>

        {pickedId !== null ? (
          <div role="status" className="reveal-panel rounded-[var(--radius-card)] bg-[#E1DAFB]/65 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1D1D1F]">
              {pickedId === current.target.id ? (
                <>
                  <CheckCircle2 size={18} className="text-[#1FA87A]" aria-hidden="true" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle size={18} className="text-[#CC2F52]" aria-hidden="true" />
                  Answer: {current.target.word.jaPlain} ({current.target.readingKana})
                </>
              )}
            </div>
            {!hideTrans ? (
              <p className="text-xs text-[#1D1D1F] font-medium">
                {getMeaningLabel(current.target)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleNext}
              className="w-full min-h-[48px] rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-bold"
            >
              {idx + 1 < questions.length ? 'Next Question' : 'See Result'}
            </button>
          </div>
        ) : null}
      </article>
    </StateTransition>
  );
}
