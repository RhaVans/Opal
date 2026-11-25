'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import type { DrillId } from '@/lib/types';
import { DrillsCbtSwitch } from '@/components/layout/DrillsCbtSwitch';
import { Sparkle } from '@/components/ui/Sparkle';
import { ArrowButton } from '@/components/ui/ArrowButton';
import { useViewTransition } from '@/components/motion/ViewTransitionProvider';
import { SequenceDrill } from '@/components/drills/SequenceDrill';
import { TableLayoutDrill } from '@/components/drills/TableLayoutDrill';
import { MathSprintDrill } from '@/components/drills/MathSprintDrill';
import { OjigiKeigoDrill } from '@/components/drills/OjigiKeigoDrill';

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

function DrillsHubInner() {
  const searchParams = useSearchParams();
  const { hydrated, drillProgress, setHideDockOverride } = useApp();
  const { runDomTransition } = useViewTransition();
  const initialParam = searchParams.get('drill') as DrillId | null;
  const initialDrill =
    initialParam && ['sequence', 'table', 'math', 'ojigi_keigo'].includes(initialParam)
      ? initialParam
      : null;
  const [activeDrill, setActiveDrill] = useState<DrillId | null>(initialDrill);

  useEffect(() => {
    const param = searchParams.get('drill') as DrillId | null;
    if (param && ['sequence', 'table', 'math', 'ojigi_keigo'].includes(param)) {
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
