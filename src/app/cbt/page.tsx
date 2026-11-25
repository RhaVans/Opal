'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { ALL_CBT_QUESTIONS } from '@/lib/curriculum';
import type { CBTAttemptRecord, CBTQuestionItem, ChapterId } from '@/lib/types';
import { DrillsCbtSwitch } from '@/components/layout/DrillsCbtSwitch';
import { Chip } from '@/components/ui/Chip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ArrowButton } from '@/components/ui/ArrowButton';
import { ListRow } from '@/components/ui/ListRow';
import { Sparkle } from '@/components/ui/Sparkle';
import { ExamRunner } from '@/components/cbt/ExamRunner';
import { ExamSummary } from '@/components/cbt/ExamSummary';

type ScopeOption = 'all' | '1' | '2' | '3' | '4' | '5' | 'weak';
type HistoryFilter = 'all' | 'exam' | 'practice' | 'passed';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function CbtHubInner() {
  const searchParams = useSearchParams();
  const { hydrated, cbtAttempts, cbtWeakList, setHideDockOverride } = useApp();

  const [scope, setScope] = useState<ScopeOption>('all');
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  const [activeSession, setActiveSession] = useState<{
    questions: CBTQuestionItem[];
    mode: 'practice' | 'exam';
    chapters: ChapterId[];
  } | null>(null);

  const [summaryData, setSummaryData] = useState<{
    attempt: CBTAttemptRecord;
    results: Array<{
      question: CBTQuestionItem;
      pickedKey: 'A' | 'B' | 'C' | 'D' | null;
      correct: boolean;
    }>;
  } | null>(null);

  const startSession = (
    countOverride?: number,
    scopeOverride?: ScopeOption,
    modeOverride?: 'practice' | 'exam'
  ) => {
    const targetScope = scopeOverride ?? scope;
    const targetMode = modeOverride ?? mode;
    const weakSet = new Set(cbtWeakList.map((w) => w.questionId));
    let pool = ALL_CBT_QUESTIONS;
    let chapters: ChapterId[] = [1, 2, 3, 4, 5];

    if (targetScope === 'weak') {
      pool = pool.filter((q) => weakSet.has(q.id));
    } else if (['1', '2', '3', '4', '5'].includes(targetScope)) {
      const ch = Number(targetScope) as ChapterId;
      pool = pool.filter((q) => q.chapter === ch);
      chapters = [ch];
    }

    const shuffled = shuffle(pool);
    const limit = countOverride ?? (targetMode === 'exam' ? 30 : shuffled.length);
    const selected = shuffled.slice(0, Math.min(limit, shuffled.length));

    setSummaryData(null);
    setActiveSession({
      questions: selected,
      mode: targetMode,
      chapters,
    });
  };

  useEffect(() => {
    const quick = searchParams.get('quick');
    const scopeParam = searchParams.get('scope');
    if (scopeParam === 'weak') {
      setScope('weak');
    }
    if (quick === '10' && hydrated && !activeSession && !summaryData) {
      startSession(10, 'all', 'practice');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hydrated]);

  useEffect(() => {
    setHideDockOverride(activeSession !== null || summaryData !== null);
    return () => setHideDockOverride(false);
  }, [activeSession, summaryData, setHideDockOverride]);

  const filteredHistory = useMemo(() => {
    return cbtAttempts.filter((a) => {
      if (historyFilter === 'exam') return a.mode === 'exam';
      if (historyFilter === 'practice') return a.mode === 'practice';
      if (historyFilter === 'passed') {
        return Math.round((a.correctCount / Math.max(1, a.totalQuestions)) * 100) >= 70;
      }
      return true;
    });
  }, [cbtAttempts, historyFilter]);

  if (summaryData) {
    return (
      <ExamSummary
        attempt={summaryData.attempt}
        results={summaryData.results}
        onDone={() => setSummaryData(null)}
      />
    );
  }

  if (activeSession) {
    return (
      <ExamRunner
        questions={activeSession.questions}
        mode={activeSession.mode}
        chaptersIncluded={activeSession.chapters}
        onComplete={(attempt, results) => {
          setActiveSession(null);
          setSummaryData({ attempt, results });
        }}
        onExit={() => setActiveSession(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <DrillsCbtSwitch />
        <h1 className="display-headline text-[#1D1D1F]">CBT</h1>
      </header>

      {/* Config Card */}
      <section
        aria-label="Configure CBT session"
        className="rounded-[var(--radius-hero)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-4"
      >
        <div className="space-y-2">
          <span className="eyebrow text-[#5B5B62] block">Scope</span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <Chip selected={scope === 'all'} onClick={() => setScope('all')}>
              All 5
            </Chip>
            {(['1', '2', '3', '4', '5'] as const).map((ch) => (
              <Chip key={ch} selected={scope === ch} onClick={() => setScope(ch)}>
                Ch {ch}
              </Chip>
            ))}
            <Chip selected={scope === 'weak'} onClick={() => setScope('weak')}>
              Weak ({cbtWeakList.length})
            </Chip>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <SegmentedControl<'practice' | 'exam'>
            ariaLabel="CBT session mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'practice', label: 'Practice' },
              { value: 'exam', label: 'Exam (30Q · 30m)' },
            ]}
          />

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              disabled={scope === 'weak' && cbtWeakList.length === 0}
              onClick={() => startSession()}
              className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-bold disabled:bg-[#E5E5EA] disabled:text-[#5B5B62]"
            >
              Start
            </button>
            <ArrowButton
              disabled={scope === 'weak' && cbtWeakList.length === 0}
              onClick={() => startSession()}
              variant="dark"
              ariaLabel="Start CBT session"
            />
          </div>
        </div>
      </section>

      {/* Attempt History */}
      <section aria-label="CBT attempt history" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#1D1D1F]">Attempt History</h2>
          <span className="text-xs font-semibold text-[#5B5B62] tabular-nums">
            {cbtAttempts.length} total
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'exam', label: 'Exam' },
              { id: 'practice', label: 'Practice' },
              { id: 'passed', label: 'Passed' },
            ] as const
          ).map((f) => (
            <Chip
              key={f.id}
              selected={historyFilter === f.id}
              onClick={() => setHistoryFilter(f.id)}
            >
              {f.label}
            </Chip>
          ))}
        </div>

        {!hydrated ? (
          <div className="rounded-[var(--radius-card)] bg-white p-5 text-sm text-[#5B5B62]">
            Loading attempt history...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-white p-6 text-center shadow-[var(--shadow-soft)] space-y-2">
            <div className="w-10 h-10 mx-auto rounded-[var(--radius-icon)] bg-[#E1DAFB] flex items-center justify-center">
              <Sparkle size={18} color="#4D3EA3" />
            </div>
            <p className="text-sm font-bold text-[#1D1D1F]">No CBT attempts yet</p>
            <p className="text-xs text-[#5B5B62]">
              Pick a chapter scope above and start Practice or a 30-minute Exam simulation.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredHistory.map((item) => {
              const pct = Math.round(
                (item.correctCount / Math.max(1, item.totalQuestions)) * 100
              );
              const passed = pct >= 70;
              const dateText = new Date(item.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const chText =
                item.chaptersIncluded.length === 5
                  ? 'Ch 1-5'
                  : `Ch ${item.chaptersIncluded.join(',')}`;

              return (
                <ListRow
                  key={item.id}
                  eyebrow={item.mode.toUpperCase()}
                  eyebrowColor={item.mode === 'exam' ? '#4D3EA3' : '#5B5B62'}
                  title={`${chText} · ${item.totalQuestions} Q`}
                  meta={`${dateText} · ${Math.round(item.durationSec / 60)}m ${item.durationSec % 60}s`}
                  rightValue={`${pct}%`}
                  badge={
                    passed ? (
                      <span className="px-2 py-0.5 rounded-[var(--radius-chip)] bg-[#1FA87A]/20 text-[#1D1D1F] text-[11px] font-bold">
                        PASS
                      </span>
                    ) : null
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CbtPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[var(--radius-hero)] bg-white p-6 text-sm text-[#5B5B62]">
          Loading CBT simulator...
        </div>
      }
    >
      <CbtHubInner />
    </Suspense>
  );
}
