'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ALL_FLASHCARDS } from '@/lib/curriculum';
import { CHAPTER_META } from '@/lib/chapters';
import { computeChapterStats, isCardWeakSpot } from '@/lib/analytics';
import { Chip } from '@/components/ui/Chip';
import { RingBadge } from '@/components/ui/RingBadge';
import { ArrowButton } from '@/components/ui/ArrowButton';
import { Sparkle } from '@/components/ui/Sparkle';
import { FuriganaText } from '@/components/text/FuriganaText';
import { GlossaryDialog } from '@/components/chapters/GlossaryDialog';

type ChapterFilter = 'all' | 'due' | 'weak' | 'bookmarked';

export default function ChaptersPage() {
  const { hydrated, settings, srsMap } = useApp();
  const [filter, setFilter] = useState<ChapterFilter>('all');
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const nowMs = Date.now();

  const screenTitle =
    settings.langPreset === 'jp_only'
      ? '章一覧'
      : settings.langPreset === 'jp_id'
        ? 'Bab'
        : 'Chapters';

  const countMatchesForChapter = (chapterId: 1 | 2 | 3 | 4 | 5): number => {
    const chCards = ALL_FLASHCARDS.filter((c) => c.chapter === chapterId);
    if (filter === 'all') return chCards.length;
    return chCards.filter((card) => {
      const st = srsMap.get(card.id);
      if (filter === 'due') return !st || st.dueTimestamp <= nowMs;
      if (filter === 'weak') return isCardWeakSpot(st);
      return Boolean(st?.bookmarked);
    }).length;
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1
            lang={settings.langPreset === 'jp_only' ? 'ja' : undefined}
            className="display-headline text-[#1D1D1F]"
          >
            {screenTitle}
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-xs font-bold">
              5 Chapters
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-[var(--radius-chip)] bg-white/95 text-[#1D1D1F] text-xs font-bold shadow-[var(--shadow-soft)] tabular-nums">
              {ALL_FLASHCARDS.length} Cards
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGlossaryOpen(true)}
          aria-label="Open glossary search"
          className="inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] shadow-[var(--shadow-soft)] hover:bg-[#F5F5F7]"
        >
          <Search size={20} aria-hidden="true" />
        </button>
      </header>

      <div
        role="group"
        aria-label="Filter chapters by card state"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'due', label: 'Due' },
            { id: 'weak', label: 'Weak' },
            { id: 'bookmarked', label: 'Bookmarked' },
          ] as const
        ).map((item) => (
          <Chip
            key={item.id}
            selected={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {!hydrated ? (
        <div
          aria-busy="true"
          className="rounded-[var(--radius-hero)] bg-white p-6 shadow-[var(--shadow-soft)] text-sm text-[#5B5B62]"
        >
          Loading chapters...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {CHAPTER_META.map((ch) => {
            const stats = computeChapterStats(ch.id, ALL_FLASHCARDS, srsMap, nowMs);
            const matchingCount = countMatchesForChapter(ch.id);
            const studyHref =
              filter === 'all'
                ? `/study?chapter=${ch.id}`
                : `/study?chapter=${ch.id}&mode=${filter}`;

            return (
              <article
                key={ch.id}
                style={{ backgroundColor: ch.toneBg, color: ch.toneBody }}
                className="rounded-[var(--radius-hero)] p-5 shadow-[var(--shadow-soft)] flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-[var(--radius-icon)] flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: ch.isDarkSurface
                          ? 'rgba(255,255,255,0.14)'
                          : 'rgba(255,255,255,0.72)',
                      }}
                    >
                      <Sparkle size={18} color={ch.toneText} />
                    </div>
                    <span className="eyebrow" style={{ color: ch.toneBody }}>
                      {ch.code} · {ch.pageRange}
                    </span>
                  </div>

                  <RingBadge
                    value={stats.masteredDisplay}
                    max={stats.total}
                    onDark={ch.isDarkSurface}
                    trackColor={
                      ch.isDarkSurface ? 'rgba(255,255,255,0.22)' : 'rgba(29,29,31,0.14)'
                    }
                    strokeColor={ch.isDarkSurface ? '#FFFFFF' : '#1D1D1F'}
                  />
                </div>

                <div className="space-y-1">
                  <h2
                    className="text-2xl font-bold leading-[1.6]"
                    style={{ color: ch.toneText }}
                  >
                    <FuriganaText
                      jaRuby={ch.jaRuby}
                      jaPlain={ch.jaPlain}
                      mode={settings.furiganaMode}
                      darkSurface={ch.isDarkSurface}
                      rtColor={ch.toneBody}
                    />
                  </h2>
                  {settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en' ? (
                    <p className="text-sm font-semibold">{ch.idTitle}</p>
                  ) : null}
                  {settings.langPreset === 'jp_en' || settings.langPreset === 'jp_id_en' ? (
                    <p className="text-xs font-medium opacity-90">{ch.enTitle}</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs font-semibold tabular-nums">
                    {filter === 'all'
                      ? `${stats.due} due · ${stats.weak} weak`
                      : `${matchingCount} ${filter} cards`}
                  </p>
                  <ArrowButton
                    href={studyHref}
                    variant="outline"
                    darkSurface={ch.isDarkSurface}
                    ariaLabel={`Study ${ch.code} ${ch.enTitle}`}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <GlossaryDialog open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
    </div>
  );
}
