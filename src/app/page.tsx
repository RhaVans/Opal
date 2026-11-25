'use client';

import Link from 'next/link';
import { Flame, AlertCircle, RotateCcw } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ALL_FLASHCARDS } from '@/lib/curriculum';
import { CHAPTER_META, getGreetingForPreset } from '@/lib/chapters';
import {
  computeChapterStats,
  computeExamReadiness,
  computeOverallMasteryPct,
  computeStreak,
  getLocalDateKey,
  isCardWeakSpot,
} from '@/lib/analytics';
import { ArrowButton } from '@/components/ui/ArrowButton';
import { RingBadge } from '@/components/ui/RingBadge';
import { StatCard } from '@/components/ui/StatCard';
import { Sparkle } from '@/components/ui/Sparkle';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';

export default function HomePage() {
  const {
    hydrated,
    dbError,
    settings,
    srsMap,
    cbtAttempts,
    cbtWeakList,
    drillProgress,
    dailyLogs,
    reloadFromDB,
  } = useApp();

  if (dbError) {
    return (
      <div className="pt-4 space-y-4">
        <h1 className="display-headline text-[#1D1D1F]">Opal</h1>
        <div
          role="alert"
          className="rounded-[var(--radius-hero)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4"
        >
          <div className="flex items-center gap-3 text-[#CC2F52]">
            <AlertCircle size={22} aria-hidden="true" />
            <h2 className="text-lg font-bold">Local storage unavailable</h2>
          </div>
          <p className="text-sm text-[#5B5B62]">{dbError}</p>
          <button
            type="button"
            onClick={() => void reloadFromDB()}
            className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-semibold"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Retry storage
          </button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const nowMs = now.getTime();
  const todayKey = getLocalDateKey(now);
  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const greeting = getGreetingForPreset(settings.langPreset, now);
  const streak = computeStreak(dailyLogs, now);
  const todayLog = dailyLogs.find((l) => l.dateKey === todayKey);
  const todayReviews = todayLog ? todayLog.reviewsCompleted : 0;

  let dueCount = 0;
  let weakCardCount = 0;
  for (const card of ALL_FLASHCARDS) {
    const st = srsMap.get(card.id);
    if (!st || st.dueTimestamp <= nowMs) {
      dueCount += 1;
    }
    if (isCardWeakSpot(st)) {
      weakCardCount += 1;
    }
  }
  const totalWeakCount = weakCardCount + cbtWeakList.length;

  const overallMasteryPct = computeOverallMasteryPct(ALL_FLASHCARDS, srsMap);
  const readiness = computeExamReadiness(overallMasteryPct, cbtAttempts, drillProgress);
  const weakChapterCounts = CHAPTER_META.map((ch) =>
    computeChapterStats(ch.id, ALL_FLASHCARDS, srsMap, nowMs)
  );
  const totalMastered = weakChapterCounts.reduce((acc, c) => acc + c.mature, 0);

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow text-[#5B5B62]">{dateLabel}</span>
          <div className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-[var(--radius-chip)] bg-[#FF7A1A] text-[#1D1D1F] text-xs font-bold shadow-[var(--shadow-soft)]">
            <Flame size={15} aria-hidden="true" />
            <span className="tabular-nums">{streak}d streak</span>
          </div>
        </div>

        <h1
          lang={settings.langPreset === 'jp_only' ? 'ja' : undefined}
          className="display-headline text-[#1D1D1F]"
        >
          <span className="block">{greeting.line1}</span>
          <span className="block">{greeting.line2}</span>
        </h1>
      </header>

      {!hydrated ? (
        <section
          aria-busy="true"
          aria-label="Loading study summary"
          className="rounded-[var(--radius-hero)] bg-[#1D1D1F] text-white p-6 space-y-4 shadow-[var(--shadow-medium)]"
        >
          <span className="eyebrow text-[#B4B4B8]">SSW Readiness</span>
          <p className="text-sm text-[#B4B4B8]">Loading local IndexedDB progress...</p>
        </section>
      ) : (
        <>
          {/* Hero Readiness Card */}
          <section
            aria-label="Exam readiness summary"
            style={{
              background: 'linear-gradient(145deg, #1D1D1F 0%, #450C3F 100%)',
            }}
            className="rounded-[var(--radius-hero)] p-6 text-white shadow-[var(--shadow-medium)] space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow text-[#B4B4B8]">SSW Readiness</span>
                <p className="stat-number mt-1">
                  <AnimatedNumber value={readiness.readinessPct} suffix="%" />
                </p>
              </div>
              <span className="text-xs font-semibold text-[#E1DAFB] tabular-nums">
                <AnimatedNumber value={totalMastered} />/{ALL_FLASHCARDS.length} mastered
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="w-full h-full rounded-full bg-[#FFD2F4] origin-left transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{ transform: `scaleX(${Math.max(0.04, readiness.readinessPct / 100)})` }}
              />
            </div>

            <div className="grid grid-cols-3 divide-x divide-white/15 pt-1 text-center">
              <div className="px-2">
                <p className="text-[11px] uppercase tracking-wider text-[#B4B4B8] font-semibold">
                  Mastery
                </p>
                <p className="text-base font-bold tabular-nums mt-0.5">
                  <AnimatedNumber value={readiness.masteryPct} suffix="%" />
                </p>
              </div>
              <div className="px-2">
                <p className="text-[11px] uppercase tracking-wider text-[#B4B4B8] font-semibold">
                  CBT avg
                </p>
                <p className="text-base font-bold tabular-nums mt-0.5">
                  <AnimatedNumber value={readiness.avgCbtPct} suffix="%" />
                </p>
              </div>
              <div className="px-2">
                <p className="text-[11px] uppercase tracking-wider text-[#B4B4B8] font-semibold">
                  Drills
                </p>
                <p className="text-base font-bold tabular-nums mt-0.5">
                  <AnimatedNumber value={readiness.drillCompletionPct} suffix="%" />
                </p>
              </div>
            </div>
          </section>

          {/* Due Queue CTA Card */}
          {dueCount > 0 ? (
            <section
              aria-label="Due review queue"
              className="rounded-[var(--radius-hero)] bg-[#4D3EA3] text-white p-5 shadow-[var(--shadow-soft)] flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="eyebrow text-[#FFD2F4]">Active Recall</span>
                <h2 className="text-2xl font-bold tabular-nums">
                  <AnimatedNumber value={dueCount} /> cards due
                </h2>
                <p className="text-sm text-white/90">Start review</p>
              </div>
              <ArrowButton
                href="/study?mode=due"
                variant="light"
                ariaLabel={`Start review for ${dueCount} due cards`}
              />
            </section>
          ) : (
            <section
              aria-label="All caught up"
              className="rounded-[var(--radius-hero)] bg-[#E1DAFB] text-[#1D1D1F] p-5 shadow-[var(--shadow-soft)] flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-white/75 flex items-center justify-center shrink-0">
                  <Sparkle size={20} color="#4D3EA3" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#4D3EA3]">All caught up</h2>
                  <p className="text-sm text-[#1D1D1F]">Browse any chapter to practice more</p>
                </div>
              </div>
              <ArrowButton
                href="/chapters"
                variant="dark"
                ariaLabel="Browse chapters"
              />
            </section>
          )}

          {/* 2-col Daily Goal + Streak */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              eyebrow="Daily goal"
              value={<AnimatedNumber value={todayReviews} />}
              sublabel={`of ${settings.dailyGoal}`}
              variant="light"
              rightSlot={
                <RingBadge
                  value={todayReviews}
                  max={settings.dailyGoal}
                  label={`${Math.min(todayReviews, settings.dailyGoal)}/${settings.dailyGoal}`}
                />
              }
            />
            <StatCard
              eyebrow="Streak"
              value={<AnimatedNumber value={streak} suffix="d" />}
              sublabel={streak === 1 ? '1 day active' : 'local days'}
              variant="dark"
            />
          </div>

          {/* Weak Spot Banner (only when weak items exist) */}
          {totalWeakCount > 0 ? (
            <section
              aria-label="Weak spot focus"
              className="rounded-[var(--radius-card)] bg-[#FFD2F4] text-[#1D1D1F] p-4 shadow-[var(--shadow-soft)] flex items-center justify-between gap-3"
            >
              <div>
                <span className="eyebrow text-[#450C3F]">Weak Spot Focus</span>
                <p className="text-base font-bold text-[#450C3F] mt-0.5 tabular-nums">
                  {totalWeakCount} items need attention
                </p>
                <p className="text-xs text-[#1D1D1F]">
                  {weakCardCount} flashcards, {cbtWeakList.length} CBT missed
                </p>
              </div>
              <ArrowButton
                href={weakCardCount > 0 ? '/study?mode=weak' : '/cbt?scope=weak'}
                variant="dark"
                ariaLabel="Review weak spot items"
              />
            </section>
          ) : null}

          {/* 2-col Quick Launch */}
          <section aria-label="Quick launch" className="grid grid-cols-2 gap-3">
            <Link
              href="/drills?drill=math"
              className="rounded-[var(--radius-card)] bg-[#E1DAFB] text-[#1D1D1F] p-4 shadow-[var(--shadow-soft)] flex flex-col justify-between min-h-[124px] hover:brightness-97 transition"
            >
              <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-white/75 flex items-center justify-center">
                <Sparkle size={18} color="#4D3EA3" />
              </div>
              <div className="mt-3">
                <span className="eyebrow text-[#4D3EA3]">Drill</span>
                <p className="text-base font-bold text-[#4D3EA3] mt-0.5">Math Sprint</p>
                <p className="text-xs text-[#1D1D1F]">OCC, ADR, RevPAR</p>
              </div>
            </Link>

            <Link
              href="/cbt?quick=10"
              className="rounded-[var(--radius-card)] bg-[#1D1D1F] text-white p-4 shadow-[var(--shadow-soft)] flex flex-col justify-between min-h-[124px] hover:bg-[#2a2a2d] transition"
            >
              <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-white/12 flex items-center justify-center">
                <Sparkle size={18} color="#FFD2F4" />
              </div>
              <div className="mt-3">
                <span className="eyebrow text-[#B4B4B8]">Simulator</span>
                <p className="text-base font-bold text-white mt-0.5">10-Q Quick CBT</p>
                <p className="text-xs text-[#B4B4B8]">Instant rationale</p>
              </div>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
