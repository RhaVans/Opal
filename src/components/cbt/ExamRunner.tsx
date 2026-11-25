'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { CBTAttemptRecord, CBTQuestionItem, ChapterId } from '@/lib/types';
import { useApp } from '@/components/AppProvider';
import { TrilingualBlock } from '@/components/text/TrilingualBlock';
import { TTSButton } from '@/components/text/TTSButton';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { SemanticIcon } from '@/components/motion/SemanticIcon';
import { StateTransition } from '@/components/motion/StateTransition';
import { emitFeedback } from '@/lib/motion/feedbackBus';

interface ExamRunnerProps {
  questions: CBTQuestionItem[];
  mode: 'practice' | 'exam';
  chaptersIncluded: ChapterId[];
  onComplete: (
    attempt: CBTAttemptRecord,
    answers: Array<{ question: CBTQuestionItem; pickedKey: 'A' | 'B' | 'C' | 'D' | null; correct: boolean }>
  ) => void;
  onExit: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTimer(sec: number): string {
  const clamped = Math.max(0, sec);
  const m = String(Math.floor(clamped / 60)).padStart(2, '0');
  const s = String(clamped % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function ExamRunner({
  questions,
  mode,
  chaptersIncluded,
  onComplete,
  onExit,
}: ExamRunnerProps) {
  const { settings, saveCBTResult } = useApp();

  // Shuffle option display order once per session
  const sessionItems = useMemo(
    () =>
      questions.map((q) => ({
        question: q,
        shuffledOptions: shuffle(q.options),
      })),
    [questions]
  );

  const [index, setIndex] = useState(0);
  const [selectedMap, setSelectedMap] = useState<Map<string, 'A' | 'B' | 'C' | 'D'>>(
    () => new Map()
  );
  const totalBudgetSec = Math.max(60, questions.length * 60); // 30Q = 30 min
  const [remainingSec, setRemainingSec] = useState(totalBudgetSec);
  const startedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);
  const selectedMapRef = useRef(selectedMap);
  useEffect(() => {
    selectedMapRef.current = selectedMap;
  }, [selectedMap]);

  const currentItem = sessionItems[index];
  const currentQ = currentItem?.question;
  const pickedKey = currentQ ? selectedMap.get(currentQ.id) ?? null : null;

  const submitSession = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const latestSelected = selectedMapRef.current;
    const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const wrongIds: string[] = [];
    let correctCount = 0;

    const results = sessionItems.map(({ question }) => {
      const choice = latestSelected.get(question.id) ?? null;
      const correct = choice === question.correctKey;
      if (correct) correctCount += 1;
      else wrongIds.push(question.id);
      return { question, pickedKey: choice, correct };
    });

    const attempt: CBTAttemptRecord = {
      id: `cbt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      mode,
      chaptersIncluded,
      totalQuestions: sessionItems.length,
      correctCount,
      wrongQuestionIds: wrongIds,
      durationSec,
    };

    await saveCBTResult(
      attempt,
      results.map((r) => ({
        questionId: r.question.id,
        chapter: r.question.chapter,
        correct: r.correct,
      }))
    );

    onComplete(attempt, results);
  }, [sessionItems, mode, chaptersIncluded, saveCBTResult, onComplete]);

  useEffect(() => {
    if (mode !== 'exam') return;
    const id = window.setInterval(() => {
      setRemainingSec((sec) => (sec <= 1 ? 0 : sec - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (mode === 'exam' && remainingSec === 0) {
      void submitSession();
    }
  }, [mode, remainingSec, submitSession]);

  if (!currentQ) {
    return (
      <div className="rounded-[var(--radius-hero)] bg-white p-6 space-y-4">
        <p className="text-sm font-bold text-[#1D1D1F]">No questions matched this filter.</p>
        <button
          type="button"
          onClick={onExit}
          className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-bold"
        >
          Back to CBT
        </button>
      </div>
    );
  }

  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    if (mode === 'practice' && pickedKey !== null) return;
    if (mode === 'practice') {
      const ok = key === currentQ.correctKey;
      emitFeedback({
        intent: ok ? 'positive' : 'negative',
        shaderPulse: { energy: 0.24, origin: [0.5, 0.5] },
      });
    }
    setSelectedMap((prev) => {
      const next = new Map(prev);
      next.set(currentQ.id, key);
      return next;
    });
  };

  const isLast = index === sessionItems.length - 1;
  const progressPct = Math.round(((index + 1) / sessionItems.length) * 100);

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit CBT session"
          className="inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] shadow-[var(--shadow-soft)]"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>

        <div className="flex-1">
          <div className="flex justify-between text-xs font-semibold text-[#5B5B62] mb-1 tabular-nums">
            <span>{mode === 'exam' ? 'Exam Simulation' : 'Practice Mode'}</span>
            <span>
              {index + 1}/{sessionItems.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className="w-full h-full rounded-full bg-[#4D3EA3] origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${progressPct / 100})` }}
            />
          </div>
        </div>

        {mode === 'exam' ? (
          <div
            className={[
              'inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-[var(--radius-chip)] text-xs font-bold tabular-nums shrink-0 transition-colors',
              remainingSec < 300 ? 'bg-[#E08E2B] text-[#1D1D1F]' : 'bg-[#1D1D1F] text-white',
            ].join(' ')}
          >
            <SemanticIcon
              behavior="rock-bell"
              trigger={remainingSec < 300 ? Math.floor(remainingSec / 60) + 1 : 0}
            >
              <Clock size={14} aria-hidden="true" />
            </SemanticIcon>
            <span>{formatTimer(remainingSec)}</span>
          </div>
        ) : null}
      </div>

      <StateTransition keyId={currentQ.id} direction="forward">
        <article
          data-vt-id="cbt-stage"
          className="rounded-[var(--radius-hero)] bg-white p-5 shadow-[var(--shadow-medium)] space-y-4"
        >
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow text-[#4D3EA3]">
            CH 0{currentQ.chapter} · p.{currentQ.pdfPage}
          </span>
          <TTSButton text={currentQ.question.jaPlain} />
        </div>

        <TrilingualBlock
          text={currentQ.question}
          furiganaMode={settings.furiganaMode}
          langPreset={settings.langPreset}
          jaClassName="text-lg font-bold leading-[1.8]"
        />

        <div className="space-y-2.5 pt-1">
          {currentItem.shuffledOptions.map((opt, displayIdx) => {
            const displayLetter = ['A', 'B', 'C', 'D'][displayIdx];
            const isPicked = pickedKey === opt.key;
            const isCorrect = opt.key === currentQ.correctKey;

            let style =
              'bg-[#F5F5F7] text-[#1D1D1F] border border-black/10 hover:bg-[#E1DAFB]/45';
            let badgeStyle = 'bg-white text-[#1D1D1F]';

            if (mode === 'practice' && pickedKey !== null) {
              if (isCorrect) {
                style = 'bg-[#1FA87A] text-[#1D1D1F] border border-[#1FA87A]';
                badgeStyle = 'bg-[#1D1D1F] text-white';
              } else if (isPicked) {
                style = 'bg-[#CC2F52] text-white border border-[#CC2F52]';
                badgeStyle = 'bg-white text-[#CC2F52]';
              }
            } else if (isPicked) {
              style = 'bg-[#4D3EA3] text-white border border-[#4D3EA3]';
              badgeStyle = 'bg-white text-[#4D3EA3]';
            }

            const darkText =
              (mode === 'exam' && isPicked) ||
              (mode === 'practice' && pickedKey !== null && isPicked && !isCorrect);

            const practiceIntent =
              mode === 'practice' && pickedKey !== null
                ? isCorrect
                  ? 'positive'
                  : isPicked
                    ? 'negative'
                    : 'neutral'
                : isPicked
                  ? 'primary'
                  : 'neutral';

            return (
              <InteractiveSurface
                key={opt.key}
                type="button"
                intent={practiceIntent}
                pressScale={0.98}
                feedbackKey={
                  mode === 'practice' && pickedKey !== null
                    ? `${currentQ.id}:${opt.key}:${pickedKey}`
                    : isPicked
                      ? `${currentQ.id}:${opt.key}`
                      : null
                }
                ariaPressed={isPicked}
                onClick={() => handleSelectOption(opt.key)}
                className={`w-full min-h-[56px] p-3.5 rounded-[var(--radius-card)] flex items-start gap-3 text-left ${style}`}
              >
                <span
                  className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${badgeStyle}`}
                >
                  {displayLetter}
                </span>
                <div className="flex-1 min-w-0">
                  <TrilingualBlock
                    text={opt.text}
                    furiganaMode={settings.furiganaMode}
                    langPreset={settings.langPreset}
                    darkSurface={darkText}
                    jaClassName="text-sm font-bold leading-[1.65]"
                    secondaryClassName="text-xs leading-snug"
                  />
                </div>
              </InteractiveSurface>
            );
          })}
        </div>

        {/* Practice Instant Rationale */}
        {mode === 'practice' && pickedKey !== null ? (
          <div
            role="status"
            className="reveal-panel rounded-[var(--radius-card)] bg-[#E1DAFB]/65 p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-[#1D1D1F]">
              {pickedKey === currentQ.correctKey ? (
                <>
                  <CheckCircle2 size={18} className="text-[#1FA87A]" aria-hidden="true" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle size={18} className="text-[#CC2F52]" aria-hidden="true" />
                  Incorrect (Check rationale)
                </>
              )}
            </div>
            <TrilingualBlock
              text={currentQ.rationale}
              furiganaMode={settings.furiganaMode}
              langPreset={settings.langPreset}
              jaClassName="text-sm font-bold leading-[1.7]"
              secondaryClassName="text-xs"
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="min-h-[48px] px-4 rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#1D1D1F] text-sm font-bold disabled:bg-[#E5E5EA] disabled:text-[#5B5B62]"
          >
            Previous
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(sessionItems.length - 1, i + 1))}
              className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-bold"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submitSession()}
              className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#4D3EA3] text-white text-sm font-bold"
            >
              Finish & Grade
            </button>
          )}
        </div>
        </article>
      </StateTransition>
    </div>
  );
}
