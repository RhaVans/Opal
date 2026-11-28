'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, CheckCircle2, Search, X } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import {
  filterKotobaCards,
  KOTOBA_CATEGORY_LABELS,
  KOTOBA_WORD_TYPE_LABELS,
  type KotobaFilterState,
  type KotobaStatusFilter,
} from '@/lib/kotoba';
import type {
  ChapterId,
  KotobaCardItem,
  KotobaCategory,
  KotobaSRSState,
  KotobaWordType,
  LangPreset,
} from '@/lib/types';

interface KotobaFilterDialogProps {
  open: boolean;
  onClose: () => void;
  filters: KotobaFilterState;
  onChange: (next: KotobaFilterState) => void;
  matchedCount: number;
}

const DEFAULT_FILTERS: KotobaFilterState = {
  category: 'all',
  chapter: 'all',
  wordType: 'all',
  status: 'all',
};

const CATEGORY_OPTIONS: Array<{ value: KotobaCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'front_desk', label: KOTOBA_CATEGORY_LABELS.front_desk },
  { value: 'planning_revenue', label: KOTOBA_CATEGORY_LABELS.planning_revenue },
  { value: 'customer_keigo', label: KOTOBA_CATEGORY_LABELS.customer_keigo },
  { value: 'restaurant_food', label: KOTOBA_CATEGORY_LABELS.restaurant_food },
  { value: 'safety_hygiene', label: KOTOBA_CATEGORY_LABELS.safety_hygiene },
  { value: 'kanji_compounds', label: KOTOBA_CATEGORY_LABELS.kanji_compounds },
];

const CHAPTER_OPTIONS: Array<{ value: ChapterId | 'all'; label: string }> = [
  { value: 'all', label: 'All Ch.' },
  { value: 1, label: 'CH 01' },
  { value: 2, label: 'CH 02' },
  { value: 3, label: 'CH 03' },
  { value: 4, label: 'CH 04' },
  { value: 5, label: 'CH 05' },
];

const TYPE_OPTIONS: Array<{ value: KotobaWordType | 'all'; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'kanji', label: KOTOBA_WORD_TYPE_LABELS.kanji },
  { value: 'katakana', label: KOTOBA_WORD_TYPE_LABELS.katakana },
  { value: 'phrase', label: KOTOBA_WORD_TYPE_LABELS.phrase },
  { value: 'keigo', label: KOTOBA_WORD_TYPE_LABELS.keigo },
];

const STATUS_OPTIONS: Array<{ value: KotobaStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'due', label: 'Due' },
  { value: 'new', label: 'New' },
  { value: 'learning', label: 'Learning' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'weak', label: 'Weak' },
  { value: 'bookmarked', label: 'Bookmarked' },
];

function useModalDialogSync(ref: React.RefObject<HTMLDialogElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [ref, open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [ref, onClose]);
}

export function KotobaFilterDialog({
  open,
  onClose,
  filters,
  onChange,
  matchedCount,
}: KotobaFilterDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useModalDialogSync(ref, open, onClose);

  return (
    <dialog ref={ref} closedby="any" aria-labelledby="kotoba-filter-title">
      <div className="p-5 space-y-5 max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 id="kotoba-filter-title" className="text-lg font-bold text-[#1D1D1F]">
              Filter Kotoba Deck
            </h2>
            <p className="text-xs text-[#5B5B62] tabular-nums">
              {matchedCount} matching items
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close filters"
            className="inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#1D1D1F]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="eyebrow text-[#5B5B62]">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                selected={filters.category === opt.value}
                onClick={() => onChange({ ...filters, category: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="eyebrow text-[#5B5B62]">Chapter</p>
          <div className="flex flex-wrap gap-2">
            {CHAPTER_OPTIONS.map((opt) => (
              <Chip
                key={String(opt.value)}
                selected={filters.chapter === opt.value}
                onClick={() => onChange({ ...filters, chapter: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="eyebrow text-[#5B5B62]">Word Type</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                selected={filters.wordType === opt.value}
                onClick={() => onChange({ ...filters, wordType: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="eyebrow text-[#5B5B62]">Progress Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                selected={filters.status === opt.value}
                onClick={() => onChange({ ...filters, status: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-black/10">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="min-h-[48px] px-4 rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#1D1D1F] text-sm font-bold"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="min-h-[48px] px-6 rounded-[var(--radius-chip)] bg-[#4D3EA3] text-white text-sm font-bold"
          >
            Done ({matchedCount})
          </button>
        </div>
      </div>
    </dialog>
  );
}

interface KotobaIndexDialogProps {
  open: boolean;
  onClose: () => void;
  cards: KotobaCardItem[];
  statesById: Map<string, KotobaSRSState>;
  langPreset: LangPreset;
  onJumpToCard: (cardId: string) => void;
}

export function KotobaIndexDialog({
  open,
  onClose,
  cards,
  statesById,
  langPreset,
  onJumpToCard,
}: KotobaIndexDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useModalDialogSync(ref, open, onClose);
  const [query, setQuery] = useState('');

  const matches = useMemo(
    () =>
      filterKotobaCards(
        cards,
        statesById,
        { category: 'all', chapter: 'all', wordType: 'all', status: 'all' },
        Date.now(),
        query
      ),
    [cards, statesById, query]
  );

  return (
    <dialog ref={ref} closedby="any" aria-labelledby="kotoba-index-title">
      <div className="p-5 space-y-4 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div>
            <h2 id="kotoba-index-title" className="text-lg font-bold text-[#1D1D1F]">
              Deck Index ({cards.length})
            </h2>
            <p className="text-xs text-[#5B5B62]">Search Kanji, Kana, Romaji, ID, or EN</p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close deck index"
            className="inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#1D1D1F]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <label htmlFor="kotoba-index-search" className="relative block shrink-0">
          <span className="sr-only">Search Kotoba vocabulary</span>
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B5B62]"
          />
          <input
            id="kotoba-index-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. kuushitsu, 空室, pajak..."
            className="w-full min-h-[48px] pl-10 pr-4 rounded-[var(--radius-chip)] bg-[#F5F5F7] text-sm text-[#1D1D1F] border border-black/10"
          />
        </label>

        <div className="overflow-y-auto space-y-2 pr-1 flex-1 min-h-0">
          {matches.length === 0 ? (
            <p className="text-sm text-[#5B5B62] py-6 text-center">No matching terms.</p>
          ) : (
            matches.map((c) => {
              const st = statesById.get(c.id);
              const mastered = Boolean(st && st.intervalDays >= 7);
              const secondary =
                langPreset === 'jp_en' ? c.word.en : c.word.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onJumpToCard(c.id);
                    ref.current?.close();
                  }}
                  className="w-full min-h-[56px] p-3 rounded-[var(--radius-card)] bg-[#F5F5F7] hover:bg-[#E1DAFB]/55 border border-black/8 flex items-center justify-between gap-3 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span lang="ja" className="text-base font-bold text-[#1D1D1F]">
                        {c.word.jaPlain}
                      </span>
                      <span lang="ja" className="text-xs text-[#5B5B62]">
                        {c.readingKana}
                      </span>
                    </div>
                    <p className="text-xs text-[#5B5B62] truncate">{secondary}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {st?.bookmarked ? (
                      <Bookmark size={14} className="text-[#FF7A1A]" fill="currentColor" aria-label="Bookmarked" />
                    ) : null}
                    {mastered ? (
                      <CheckCircle2 size={14} className="text-[#1FA87A]" aria-label="Mastered" />
                    ) : null}
                    <span className="text-[11px] font-bold text-[#4D3EA3] bg-white px-2 py-0.5 rounded-full">
                      p.{c.pdfPage}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </dialog>
  );
}
