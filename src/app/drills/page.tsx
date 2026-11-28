'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { ALL_KOTOBA_CARDS } from '@/lib/curriculum';
import { computeKotobaSummary } from '@/lib/analytics';
import type { DrillId } from '@/lib/types';
import { DrillsCbtSwitch } from '@/components/layout/DrillsCbtSwitch';
import { Sparkle } from '@/components/ui/Sparkle';
import { ArrowButton } from '@/components/ui/ArrowButton';
import { useViewTransition } from '@/components/motion/ViewTransitionProvider';
import { SequenceDrill } from '@/components/drills/SequenceDrill';
import { TableLayoutDrill } from '@/components/drills/TableLayoutDrill';
import { MathSprintDrill } from '@/components/drills/MathSprintDrill';
import { OjigiKeigoDrill } from '@/components/drills/OjigiKeigoDrill';
import { KotobaFlashcardDrill } from '@/components/drills/KotobaFlashcardDrill';

interface DrillCardConfig {
  id: DrillId;
  title: string;
  subtitle: string;
  bg: string;
  titleColor: string;
  bodyColor: string;
  isDark: boolean;
}

const DRILL_CARDS: DrillCardConfig[] = [
  {
    id: 'sequence',
    title: 'Sequence Builder',
    subtitle: 'Kaiseki, Western, Front Desk, Complaint',
    bg: '#E1DAFB',
    titleColor: '#4D3EA3',
    bodyColor: '#1D1D1F',
    isDark: false,
  },
  {
    id: 'table',
    title: 'Table & Etiquette',
    subtitle: 'Washoku tray, Western mat, cutlery',
    bg: '#FFD2F4',
    titleColor: '#450C3F',
    bodyColor: '#1D1D1F',
    isDark: false,
  },
  {
    id: 'math',
    title: 'Math Sprint',
    subtitle: 'OCC, ADR & RevPAR keypad sprint',
    bg: '#758AD1',
    titleColor: '#1D1D1F',
    bodyColor: '#1D1D1F',
    isDark: false,
  },
  {
    id: 'ojigi_keigo',
    title: 'Ojigi & Keigo',
    subtitle: '15°/30°/45° angles & honorifics',
    bg: '#1D1D1F',
    titleColor: '#FFFFFF',
    bodyColor: '#B4B4B8',
    isDark: true,
  },
];

const VALID_DRILLS: readonly DrillId[] = ['sequence', 'table', 'math', 'ojigi_keigo', 'kotoba'];

function DrillsHubInner() {
  const searchParams = useSearchParams();
  const { hydrated, drillProgress, kotobaMap, setHideDockOverride } = useApp();
  const { runDomTransition } = useViewTransition();
  const initialParam = searchParams.get('drill') as DrillId | null;
  const initialDrill =
    initialParam && VALID_DRILLS.includes(initialParam)
      ? initialParam
      : null;
  const [activeDrill, setActiveDrill] = useState<DrillId | null>(initialDrill);

  const kotobaStats = useMemo(
    () => computeKotobaSummary(ALL_KOTOBA_CARDS, kotobaMap, Date.now()),
    [kotobaMap]
  );

  useEffect(() => {
    const param = searchParams.get('drill') as DrillId | null;
    if (param && VALID_DRILLS.includes(param)) {
      setActiveDrill(param);
    }
  }, [searchParams]);

  useEffect(() => {
    setHideDockOverride(activeDrill !== null);
    return () => setHideDockOverride(false);
  }, [activeDrill, setHideDockOverride]);

  const openDrill = (id: DrillId) => {
    runDomTransition(() => setActiveDrill(id), {
      type: 'morph',
      sourceId: `drill-${id}`,
      targetId: `drill-${id}`,
    });
  };

  const exitDrill = () => {
    const exitingId = activeDrill;
    runDomTransition(() => setActiveDrill(null), {
      type: 'morph',
      sourceId: exitingId ? `drill-${exitingId}` : undefined,
      targetId: exitingId ? `drill-${exitingId}` : undefined,
    });
  };

  if (activeDrill === 'sequence') {
    return <SequenceDrill onExit={exitDrill} />;
  }
  if (activeDrill === 'table') {
    return <TableLayoutDrill onExit={exitDrill} />;
  }
  if (activeDrill === 'math') {
    return <MathSprintDrill onExit={exitDrill} />;
  }
  if (activeDrill === 'ojigi_keigo') {
    return <OjigiKeigoDrill onExit={exitDrill} />;
  }
  if (activeDrill === 'kotoba') {
    return <KotobaFlashcardDrill onExit={exitDrill} />;
  }

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <DrillsCbtSwitch />
        <h1 className="display-headline text-[#1D1D1F]">Drills</h1>
      </header>

      {!hydrated ? (
        <div
          aria-busy="true"
          className="rounded-[var(--radius-hero)] bg-white p-6 shadow-[var(--shadow-soft)] text-sm text-[#5B5B62]"
        >
          Loading drills...
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Featured Full-Width Kotoba & Kanji Perhotelan Bento Card */}
          <article
            data-vt-id="drill-kotoba"
            style={{
              background: 'linear-gradient(135deg, #450C3F 0%, #4D3EA3 100%)',
            }}
            className="col-span-2 min-w-0 rounded-[var(--radius-hero)] p-5 shadow-[var(--shadow-medium)] text-white flex flex-col justify-between gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-white/14 flex items-center justify-center shrink-0">
                  <Sparkle size={18} color="#FFD2F4" />
                </div>
                <span className="eyebrow text-[#FFD2F4]">
                  Kotoba &amp; Kanji
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-[var(--radius-chip)] bg-white/14 text-white text-[11px] font-bold tabular-nums whitespace-nowrap shrink-0">
                {kotobaStats.due} due
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold leading-tight text-white">
                Kotoba &amp; Kanji Perhotelan
              </h2>
              <p lang="ja" className="text-xs font-semibold text-[#FFD2F4]">
                ホテル・旅館の言葉と漢字 · CH 01-05 ({kotobaStats.total} items)
              </p>
              <p className="text-xs text-[#E1DAFB] leading-relaxed">
                SM-2 vocabulary &amp; kanji breakdown, exam traps, free swipe practice, and 4-option Quick Quiz.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold tabular-nums text-white/90">
                <span>Mastered: {kotobaStats.mastered}/{kotobaStats.total}</span>
                <span>Bookmarked: {kotobaStats.bookmarked}</span>
              </div>
              <ArrowButton
                onClick={() => openDrill('kotoba')}
                variant="outline"
                darkSurface
                ariaLabel="Start Kotoba & Kanji Perhotelan"
              />
            </div>
          </article>

          {DRILL_CARDS.map((card) => {
            const prog = drillProgress.find((d) => d.drillId === card.id);
            const badgeText = prog ? `Best ${prog.bestAccuracy}%` : 'New';
            return (
              <article
                key={card.id}
                data-vt-id={`drill-${card.id}`}
                style={{ backgroundColor: card.bg, color: card.bodyColor }}
                className="min-w-0 rounded-[var(--radius-hero)] p-4 shadow-[var(--shadow-soft)] flex flex-col justify-between min-h-[198px] gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="w-10 h-10 rounded-[var(--radius-icon)] flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: card.isDark
                        ? 'rgba(255,255,255,0.14)'
                        : 'rgba(255,255,255,0.72)',
                    }}
                  >
                    <Sparkle size={18} color={card.titleColor} />
                  </div>
                  <span
                    className={[
                      'px-2.5 py-1 rounded-[var(--radius-chip)] text-[11px] font-bold tabular-nums whitespace-nowrap',
                      card.isDark
                        ? 'bg-white/14 text-white'
                        : 'bg-white/75 text-[#1D1D1F]',
                    ].join(' ')}
                  >
                    {badgeText}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2
                    className="text-lg font-bold leading-tight"
                    style={{ color: card.titleColor }}
                  >
                    {card.title}
                  </h2>
                  <p className="text-xs leading-snug">{card.subtitle}</p>
                </div>

                <div className="flex justify-end">
                  <ArrowButton
                    onClick={() => openDrill(card.id)}
                    variant="outline"
                    darkSurface={card.isDark}
                    ariaLabel={`Start ${card.title}`}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DrillsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[var(--radius-hero)] bg-white p-6 text-sm text-[#5B5B62]">
          Loading drills...
        </div>
      }
    >
      <DrillsHubInner />
    </Suspense>
  );
}
