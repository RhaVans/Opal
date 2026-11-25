'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { CBTAttemptRecord, CBTQuestionItem } from '@/lib/types';
import { CHAPTER_META } from '@/lib/chapters';
import { useApp } from '@/components/AppProvider';
import { Sparkle } from '@/components/ui/Sparkle';
import { TrilingualBlock } from '@/components/text/TrilingualBlock';
import { TTSButton } from '@/components/text/TTSButton';

interface ExamSummaryProps {
  attempt: CBTAttemptRecord;
  results: Array<{
    question: CBTQuestionItem;
    pickedKey: 'A' | 'B' | 'C' | 'D' | null;
    correct: boolean;
  }>;
  onDone: () => void;
}

export function ExamSummary({ attempt, results, onDone }: ExamSummaryProps) {
  const { settings } = useApp();
  const [showMissed, setShowMissed] = useState(false);

  const scorePct = Math.round(
    (attempt.correctCount / Math.max(1, attempt.totalQuestions)) * 100
  );
  const passed = scorePct >= 70;
  const missed = results.filter((r) => !r.correct);

  const chapterBreakdown = CHAPTER_META.map((ch) => {
    const chItems = results.filter((r) => r.question.chapter === ch.id);
    const chCorrect = chItems.filter((r) => r.correct).length;
    const pct = chItems.length ? Math.round((chCorrect / chItems.length) * 100) : null;
    return { ch, total: chItems.length, correct: chCorrect, pct };
  }).filter((row) => row.total > 0);

  return (
    <div className="space-y-4 pb-10">
      {/* Dark Hero Score Card */}
      <section className="rounded-[var(--radius-hero)] bg-[#1D1D1F] text-white p-6 shadow-[var(--shadow-medium)] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="eyebrow text-[#B4B4B8]">
              {attempt.mode === 'exam' ? 'Exam Simulation Result' : 'Practice Result'}
            </span>
            <h1 className="stat-number mt-1">{scorePct}%</h1>
            <p className="text-sm text-[#B4B4B8] mt-1 tabular-nums">
              {attempt.correctCount}/{attempt.totalQuestions} correct · {Math.round(attempt.durationSec / 60)}m {attempt.durationSec % 60}s
            </p>
          </div>

          <div
            className={[
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-chip)] text-xs font-bold',
              passed ? 'bg-[#1FA87A] text-[#1D1D1F]' : 'bg-[#CC2F52] text-white',
            ].join(' ')}
          >
            {passed ? <Sparkle size={14} color="#1D1D1F" /> : null}
            <span>{passed ? 'PASS (>=70%)' : 'BELOW 70%'}</span>
          </div>
        </div>

        {/* Per-chapter stacked horizontal progress bars */}
        <div className="space-y-3 pt-2 border-t border-white/15">
          <span className="eyebrow text-[#B4B4B8] block">Per-Chapter Accuracy</span>
          {chapterBreakdown.map((row) => (
            <div key={row.ch.id} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold tabular-nums">
                <span>
                  {row.ch.code} {row.ch.enTitle}
                </span>
                <span>
                  {row.correct}/{row.total} ({row.pct}%)
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/15 overflow-hidden flex">
                <div
                  className="h-full bg-[#1FA87A]"
                  style={{ width: `${row.pct ?? 0}%` }}
                />
                <div
                  className="h-full bg-[#CC2F52]"
                  style={{ width: `${100 - (row.pct ?? 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2">
          {missed.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowMissed((s) => !s)}
              className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#FFD2F4] text-[#450C3F] text-sm font-bold"
            >
              {showMissed ? 'Hide Missed Questions' : `Review Missed Questions (${missed.length})`}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDone}
            className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] text-sm font-bold"
          >
            Back to CBT
          </button>
        </div>
      </section>

      {showMissed && missed.length > 0 ? (
        <section aria-label="Missed questions review" className="space-y-3">
          {missed.map(({ question, pickedKey }) => {
            const correctOpt = question.options.find((o) => o.key === question.correctKey);
            const pickedOpt = question.options.find((o) => o.key === pickedKey);
            return (
              <article
                key={question.id}
                className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow text-[#CC2F52]">
                    CH 0{question.chapter} · p.{question.pdfPage}
                  </span>
                  <TTSButton text={question.question.jaPlain} />
                </div>

                <TrilingualBlock
                  text={question.question}
                  furiganaMode={settings.furiganaMode}
                  langPreset={settings.langPreset}
                  jaClassName="text-base font-bold leading-[1.75]"
                />

                {pickedOpt ? (
                  <div className="rounded-[var(--radius-card)] bg-[#CC2F52]/12 p-3 flex items-start gap-2 text-xs text-[#1D1D1F]">
                    <XCircle size={16} className="text-[#CC2F52] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-bold">Your pick: </span>
                      <span>
                        {pickedOpt.text.jaPlain}
                        {settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en'
                          ? ` (${pickedOpt.text.id})`
                          : settings.langPreset === 'jp_en'
                            ? ` (${pickedOpt.text.en})`
                            : ''}
                      </span>
                    </div>
                  </div>
                ) : null}

                {correctOpt ? (
                  <div className="rounded-[var(--radius-card)] bg-[#1FA87A]/16 p-3 flex items-start gap-2 text-xs text-[#1D1D1F]">
                    <CheckCircle2 size={16} className="text-[#1FA87A] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-bold">Correct answer: </span>
                      <span>
                        {correctOpt.text.jaPlain}
                        {settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en'
                          ? ` (${correctOpt.text.id})`
                          : settings.langPreset === 'jp_en'
                            ? ` (${correctOpt.text.en})`
                            : ''}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="pt-2 border-t border-black/10">
                  <span className="eyebrow text-[#4D3EA3] block mb-1">Rationale</span>
                  <TrilingualBlock
                    text={question.rationale}
                    furiganaMode={settings.furiganaMode}
                    langPreset={settings.langPreset}
                    jaClassName="text-sm font-bold leading-[1.7]"
                    secondaryClassName="text-xs"
                  />
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
