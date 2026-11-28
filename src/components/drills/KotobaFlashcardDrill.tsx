'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  List,
  RotateCw,
  Shuffle,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ALL_KOTOBA_CARDS } from '@/lib/curriculum';
import { createInitialKotobaState, getRatingPreviews } from '@/lib/srs';
import { speakJapanese, stopSpeaking } from '@/lib/tts';
import { emitFeedback } from '@/lib/motion/feedbackBus';
import type { InteractionIntent } from '@/lib/motion/tokens';
import {
  filterKotobaCards,
  KOTOBA_CATEGORY_LABELS,
  KOTOBA_WORD_TYPE_LABELS,
  type KotobaFilterState,
} from '@/lib/kotoba';
import type {
  FuriganaMode,
  KotobaCardItem,
  KotobaFrontMode,
  KotobaStudyMode,
  SRSRating,
} from '@/lib/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sparkle } from '@/components/ui/Sparkle';
import { FuriganaText } from '@/components/text/FuriganaText';
import { TrilingualBlock } from '@/components/text/TrilingualBlock';
import { TTSButton } from '@/components/text/TTSButton';
import {
  LangCycleChip,
  PeekTranslationButton,
  QuestionStudyControls,
} from '@/components/text/QuestionStudyControls';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { SemanticIcon } from '@/components/motion/SemanticIcon';
import { KotobaFilterDialog, KotobaIndexDialog } from './KotobaDrawers';
import { KotobaQuickQuiz } from './KotobaQuickQuiz';

interface KotobaFlashcardDrillProps {
  onExit: () => void;
}

const RATING_INTENT: Record<SRSRating, InteractionIntent> = {
  again: 'negative',
  hard: 'caution',
  good: 'positive',
  easy: 'primary',
};

const FURIGANA_CYCLE: FuriganaMode[] = ['on', 'peek', 'off'];

function shuffleIds(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function KotobaFlashcardDrill({ onExit }: KotobaFlashcardDrillProps) {
  const {
    settings,
    kotobaMap,
    ttsAvailability,
    ttsTipDismissed,
    dismissTtsTip,
    updateSettings,
    reviewKotoba,
    toggleKotobaBookmark,
    saveDrillResult,
  } = useApp();

  const [studyMode, setStudyMode] = useState<KotobaStudyMode>('srs');
  const [frontMode, setFrontMode] = useState<KotobaFrontMode>('jp_to_meaning');
  const [filters, setFilters] = useState<KotobaFilterState>({
    category: 'all',
    chapter: 'all',
    wordType: 'all',
    status: 'all',
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);

  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);
  const [shuffleNonce, setShuffleNonce] = useState(0);
  const [srsQueueIds, setSrsQueueIds] = useState<string[] | null>(null);
  const [freeIdx, setFreeIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [peekTranslation, setPeekTranslation] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const shownAtRef = useRef<number>(Date.now());
  const ratingPendingRef = useRef(false);
  const lastSpokenRef = useRef<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevQueueSigRef = useRef<string>('');

  const cardById = useMemo(
    () => new Map<string, KotobaCardItem>(ALL_KOTOBA_CARDS.map((c) => [c.id, c])),
    []
  );

  const queueSignature = `${studyMode}:${filters.category}:${filters.chapter}:${filters.wordType}:${filters.status}:${shuffleNonce}`;

  const filteredCards = useMemo(() => {
    const now = Date.now();
    const list = filterKotobaCards(ALL_KOTOBA_CARDS, kotobaMap, filters, now);
    if (!shuffledOrder) return list;
    const rank = new Map(shuffledOrder.map((id, idx) => [id, idx]));
    return [...list].sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
  }, [kotobaMap, filters, shuffledOrder]);

  // Build SRS due queue only when mode, filters, or explicit shuffle change
  useEffect(() => {
    if (studyMode !== 'srs') return;
    if (prevQueueSigRef.current === queueSignature && srsQueueIds !== null) return;
    prevQueueSigRef.current = queueSignature;
    const now = Date.now();
    const dueIds = filteredCards
      .filter((c) => {
        const st = kotobaMap.get(c.id);
        return !st || st.dueTimestamp <= now;
      })
      .map((c) => c.id);
    setSrsQueueIds(dueIds);
    setFlipped(false);
    setPeekTranslation(false);
    shownAtRef.current = now;
  }, [studyMode, queueSignature, srsQueueIds, filteredCards, kotobaMap]);

  const activeFilterCount =
    (filters.category !== 'all' ? 1 : 0) +
    (filters.chapter !== 'all' ? 1 : 0) +
    (filters.wordType !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0);

  const currentCard: KotobaCardItem | null = useMemo(() => {
    if (studyMode === 'srs') {
      if (!srsQueueIds || srsQueueIds.length === 0) return null;
      return cardById.get(srsQueueIds[0]) ?? null;
    }
    if (studyMode === 'free') {
      if (filteredCards.length === 0) return null;
      const safeIdx = Math.min(freeIdx, filteredCards.length - 1);
      return filteredCards[safeIdx] ?? null;
    }
    return null;
  }, [studyMode, srsQueueIds, cardById, filteredCards, freeIdx]);

  const currentState = useMemo(() => {
    if (!currentCard) return null;
    return (
      kotobaMap.get(currentCard.id) ??
      createInitialKotobaState(currentCard.id, currentCard.chapter, currentCard.category, Date.now())
    );
  }, [currentCard, kotobaMap]);

  const previews = useMemo(() => {
    if (!currentState) return { again: '<1m', hard: '12h', good: '1d', easy: '4d' };
    return getRatingPreviews(currentState, Date.now());
  }, [currentState]);

  // Autoplay Japanese TTS when card changes or flips to reveal JP
  useEffect(() => {
    if (!currentCard || !settings.ttsAutoPlay || studyMode === 'quiz') return;
    const sideKey = `${currentCard.id}:${flipped ? 'back' : 'front'}`;
    if (lastSpokenRef.current === sideKey) return;
    lastSpokenRef.current = sideKey;
    if (!flipped && frontMode === 'meaning_to_jp') return;
    speakJapanese(currentCard.ttsText, settings.ttsRate);
  }, [currentCard, flipped, frontMode, studyMode, settings.ttsAutoPlay, settings.ttsRate]);

  const handleFlip = useCallback(() => {
    setFlipped((f) => !f);
  }, []);

  const handleRate = useCallback(
    async (rating: SRSRating) => {
      if (!currentCard || !srsQueueIds || ratingPendingRef.current) return;
      ratingPendingRef.current = true;
      try {
        stopSpeaking();
        emitFeedback({
          intent: RATING_INTENT[rating],
          shaderPulse: {
            energy: rating === 'good' || rating === 'easy' ? 0.26 : 0.22,
            origin: [0.5, 0.14],
          },
        });
        const elapsedSec = Math.max(2, (Date.now() - shownAtRef.current) / 1000);
        await reviewKotoba(currentCard.id, currentCard.chapter, currentCard.category, rating, elapsedSec);
        setSrsQueueIds((prev) => {
          if (!prev || prev.length === 0) return [];
          const [head, ...rest] = prev;
          if (rating === 'again') {
            const insertIdx = Math.min(rest.length, 3);
            const nextQ = [...rest];
            nextQ.splice(insertIdx, 0, head);
            return nextQ;
          }
          return rest;
        });
        setReviewedCount((c) => c + 1);
        setFlipped(false);
        setPeekTranslation(false);
        shownAtRef.current = Date.now();
      } finally {
        ratingPendingRef.current = false;
      }
    },
    [currentCard, srsQueueIds, reviewKotoba]
  );

  const handleStepFree = useCallback(
    (delta: number) => {
      if (filteredCards.length === 0) return;
      stopSpeaking();
      setFreeIdx((prev) => (prev + delta + filteredCards.length) % filteredCards.length);
      setFlipped(false);
      setPeekTranslation(false);
      shownAtRef.current = Date.now();
    },
    [filteredCards.length]
  );

  const handleShuffle = () => {
    const ids = shuffleIds(ALL_KOTOBA_CARDS.map((c) => c.id));
    setShuffledOrder(ids);
    setShuffleNonce((n) => n + 1);
    setFreeIdx(0);
    setFlipped(false);
    setPeekTranslation(false);
  };

  const handleJumpToCard = (cardId: string) => {
    const targetCard = cardById.get(cardId);
    if (!targetCard) return;
    stopSpeaking();
    setFlipped(false);
    setPeekTranslation(false);
    if (studyMode === 'quiz') {
      setStudyMode('free');
    }
    if (studyMode === 'srs') {
      setSrsQueueIds((prev) => {
        const rest = (prev ?? []).filter((id) => id !== cardId);
        return [cardId, ...rest];
      });
    } else {
      const idxInFiltered = filteredCards.findIndex((c) => c.id === cardId);
      if (idxInFiltered >= 0) {
        setFreeIdx(idxInFiltered);
      } else {
        setFilters({ category: 'all', chapter: 'all', wordType: 'all', status: 'all' });
        setShuffledOrder(null);
        const allIdx = ALL_KOTOBA_CARDS.findIndex((c) => c.id === cardId);
        setFreeIdx(Math.max(0, allIdx));
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (filterOpen || indexOpen || studyMode === 'quiz' || !currentCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const lower = e.key.toLowerCase();
      if (e.key === ' ') {
        if (document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          handleFlip();
        }
      } else if (studyMode === 'srs' && flipped) {
        if (e.key === '1') void handleRate('again');
        else if (e.key === '2') void handleRate('hard');
        else if (e.key === '3') void handleRate('good');
        else if (e.key === '4') void handleRate('easy');
      } else if (studyMode === 'free' && e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepFree(1);
      } else if (studyMode === 'free' && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepFree(-1);
      }
      if (lower === 'f') {
        e.preventDefault();
        const nextF = FURIGANA_CYCLE[(FURIGANA_CYCLE.indexOf(settings.furiganaMode) + 1) % 3];
        void updateSettings({ furiganaMode: nextF });
      } else if (lower === 't') {
        e.preventDefault();
        void updateSettings({ hideTranslation: !settings.hideTranslation });
      } else if (lower === 's') {
        e.preventDefault();
        speakJapanese(currentCard.ttsText, settings.ttsRate);
      } else if (lower === 'b') {
        e.preventDefault();
        void toggleKotobaBookmark(currentCard.id, currentCard.chapter, currentCard.category);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    filterOpen,
    indexOpen,
    studyMode,
    currentCard,
    flipped,
    settings.furiganaMode,
    settings.hideTranslation,
    settings.ttsRate,
    handleFlip,
    handleRate,
    handleStepFree,
    updateSettings,
    toggleKotobaBookmark,
  ]);

  const remainingCount = srsQueueIds?.length ?? 0;
  const totalSrsSession = reviewedCount + remainingCount;
  const progressPct =
    studyMode === 'srs'
      ? totalSrsSession === 0
        ? 100
        : Math.round((reviewedCount / totalSrsSession) * 100)
      : studyMode === 'free'
        ? filteredCards.length === 0
          ? 0
          : Math.round(((Math.min(freeIdx, filteredCards.length - 1) + 1) / filteredCards.length) * 100)
        : 0;

  const meaningTextForCard = (c: KotobaCardItem) => {
    if (settings.langPreset === 'jp_en') return c.word.en;
    if (settings.langPreset === 'jp_id_en') return `${c.word.id} / ${c.word.en}`;
    return c.word.id;
  };

  return (
    <div className="space-y-3.5 pb-36">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          aria-label="Back to drills"
          className="inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] shadow-[var(--shadow-soft)] shrink-0"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#5B5B62] mb-1 tabular-nums">
            <span className="shrink-0">Kotoba</span>
            <span className="truncate text-right">
              {studyMode === 'srs'
                ? `${reviewedCount} · ${remainingCount} due`
                : studyMode === 'free'
                  ? `${filteredCards.length ? Math.min(freeIdx + 1, filteredCards.length) : 0}/${filteredCards.length}`
                  : `${filteredCards.length} pool`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className="w-full h-full rounded-full bg-[#4D3EA3] origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${progressPct / 100})` }}
            />
          </div>
        </div>

        <LangCycleChip />
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl<KotobaStudyMode>
          ariaLabel="Kotoba study mode"
          value={studyMode}
          onChange={(next) => {
            stopSpeaking();
            setStudyMode(next);
            setFlipped(false);
            setPeekTranslation(false);
          }}
          options={[
            { value: 'srs', label: 'SRS Review' },
            { value: 'free', label: 'Free Practice' },
            { value: 'quiz', label: 'Quick Quiz' },
          ]}
        />
      </div>

      {/* Universal Furigana & Hide Translation Controls */}
      <QuestionStudyControls />

      {/* Direction + Deck Utility Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<KotobaFrontMode>
          ariaLabel="Flashcard prompt direction"
          value={frontMode}
          onChange={(next) => {
            setFrontMode(next);
            setFlipped(false);
          }}
          options={[
            { value: 'jp_to_meaning', label: 'JP -> Arti' },
            { value: 'meaning_to_jp', label: 'Arti -> JP' },
            { value: 'kana_to_kanji', label: 'Kana -> Kanji' },
          ]}
        />

        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={[
            'inline-flex items-center justify-center gap-1.5 min-w-[48px] min-h-[48px] px-3.5 rounded-[var(--radius-chip)] text-xs font-bold border',
            activeFilterCount > 0
              ? 'bg-[#450C3F] text-white border-[#450C3F]'
              : 'bg-white text-[#1D1D1F] border-black/12 shadow-[var(--shadow-soft)]',
          ].join(' ')}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          <span>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setIndexOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 min-w-[48px] min-h-[48px] px-3.5 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] border border-black/12 shadow-[var(--shadow-soft)] text-xs font-bold"
        >
          <List size={15} aria-hidden="true" />
          <span>Index ({filteredCards.length})</span>
        </button>

        <button
          type="button"
          onClick={handleShuffle}
          aria-label="Shuffle Kotoba deck"
          className="inline-flex items-center justify-center gap-1.5 min-w-[48px] min-h-[48px] px-3.5 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] border border-black/12 shadow-[var(--shadow-soft)] text-xs font-bold"
        >
          <Shuffle size={15} aria-hidden="true" />
          <span>Shuffle</span>
        </button>
      </div>

      {!ttsAvailability.hasJapaneseVoice && !ttsTipDismissed ? (
        <div
          role="status"
          className="rounded-[var(--radius-card)] bg-[#FFD2F4] text-[#450C3F] p-3.5 text-xs flex items-center justify-between gap-3"
        >
          <p className="font-medium">
            No offline Japanese (ja-JP) TTS voice detected on this device. Install Japanese speech data in OS settings for offline pronunciation.
          </p>
          <button
            type="button"
            onClick={dismissTtsTip}
            className="min-h-[48px] px-3 rounded-[var(--radius-chip)] bg-[#450C3F] text-white font-semibold shrink-0"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {studyMode === 'quiz' ? (
        <KotobaQuickQuiz
          pool={filteredCards}
          allCards={ALL_KOTOBA_CARDS}
          frontMode={frontMode}
          onFinishQuiz={(accuracy, durationSec) => {
            void saveDrillResult('kotoba', accuracy, durationSec);
          }}
        />
      ) : !currentCard ? (
        <section className="rounded-[var(--radius-hero)] bg-white p-7 text-center shadow-[var(--shadow-medium)] space-y-4">
          <div className="w-12 h-12 mx-auto rounded-[var(--radius-icon)] bg-[#E1DAFB] flex items-center justify-center">
            <Sparkle size={24} color="#4D3EA3" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1F]">
            {filteredCards.length === 0
              ? 'No matching cards'
              : reviewedCount > 0
                ? 'SRS queue complete'
                : 'All caught up'}
          </h2>
          <p className="text-sm text-[#5B5B62]">
            {filteredCards.length === 0
              ? 'No items match the current category, chapter, or status filter.'
              : `No Kotoba items are due right now across ${filteredCards.length} filtered cards.`}
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 pt-1">
            {filteredCards.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setStudyMode('free');
                  setFreeIdx(0);
                }}
                className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#4D3EA3] text-white text-sm font-bold"
              >
                Free Practice ({filteredCards.length})
              </button>
            ) : null}
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setFilters({ category: 'all', chapter: 'all', wordType: 'all', status: 'all' })
                }
                className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-bold"
              >
                Reset Filters
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <div
          className="relative"
          onPointerDown={(e) => {
            if (studyMode !== 'free') return;
            if ((e.target as HTMLElement).closest('button, a')) return;
            swipeStartRef.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const start = swipeStartRef.current;
            swipeStartRef.current = null;
            if (!start || studyMode !== 'free') return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.3) {
              handleStepFree(dx < 0 ? 1 : -1);
            }
          }}
        >
          {/* FRONT FACE */}
          <article
            key={`front:${currentCard.id}:${flipped}`}
            aria-hidden={flipped}
            inert={flipped}
            data-vt-id="drill-kotoba"
            className={
              flipped
                ? 'invisible absolute inset-0 pointer-events-none overflow-hidden'
                : 'kotoba-card-face rounded-[var(--radius-hero)] bg-white text-[#1D1D1F] p-5 shadow-[var(--shadow-medium)] space-y-5'
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-[var(--radius-chip)] bg-[#E1DAFB] text-[#4D3EA3] text-xs font-bold tabular-nums">
                  CH 0{currentCard.chapter} · p.{currentCard.pdfPage}
                </span>
                <span className="px-2.5 py-1 rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#5B5B62] text-xs font-semibold">
                  {KOTOBA_CATEGORY_LABELS[currentCard.category]}
                </span>
                <span className="px-2.5 py-1 rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold">
                  {KOTOBA_WORD_TYPE_LABELS[currentCard.wordType]}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {frontMode === 'meaning_to_jp' ? (
                  <PeekTranslationButton
                    peeking={peekTranslation}
                    onToggle={() => setPeekTranslation((p) => !p)}
                  />
                ) : null}
                {frontMode !== 'meaning_to_jp' ? (
                  <TTSButton text={currentCard.ttsText} ariaLabel="Listen to word pronunciation" />
                ) : null}
                <InteractiveSurface
                  type="button"
                  intent="caution"
                  pressScale={0.94}
                  feedbackKey={currentState?.bookmarked ? `${currentCard.id}:bm` : null}
                  onClick={() =>
                    void toggleKotobaBookmark(currentCard.id, currentCard.chapter, currentCard.category)
                  }
                  ariaPressed={Boolean(currentState?.bookmarked)}
                  ariaLabel={currentState?.bookmarked ? 'Remove bookmark' : 'Bookmark word'}
                  className={[
                    'inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] shrink-0',
                    currentState?.bookmarked
                      ? 'bg-[#FF7A1A] text-[#1D1D1F]'
                      : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/10',
                  ].join(' ')}
                >
                  <SemanticIcon behavior="pop-fill" active={Boolean(currentState?.bookmarked)}>
                    <Bookmark
                      size={20}
                      fill={currentState?.bookmarked ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                  </SemanticIcon>
                </InteractiveSurface>
              </div>
            </div>

            <div className="py-4 text-center space-y-2">
              {frontMode === 'jp_to_meaning' ? (
                <div className="text-3xl sm:text-4xl font-bold leading-[1.7] text-[#1D1D1F]">
                  <FuriganaText
                    jaRuby={currentCard.word.jaRuby}
                    jaPlain={currentCard.word.jaPlain}
                    mode={settings.furiganaMode}
                  />
                </div>
              ) : frontMode === 'kana_to_kanji' ? (
                <p lang="ja" className="text-3xl sm:text-4xl font-bold leading-[1.7] text-[#1D1D1F]">
                  {currentCard.readingKana}
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-2xl font-bold text-[#1D1D1F] leading-snug">
                    {settings.hideTranslation && !peekTranslation
                      ? `${KOTOBA_CATEGORY_LABELS[currentCard.category]} · ${KOTOBA_WORD_TYPE_LABELS[currentCard.wordType]}`
                      : meaningTextForCard(currentCard)}
                  </p>
                  {!settings.hideTranslation || peekTranslation ? (
                    <p className="text-xs text-[#5B5B62]">Tap Reveal to see Japanese term &amp; reading</p>
                  ) : (
                    <p className="text-xs text-[#5B5B62]">Translation hidden. Tap Peek or Reveal.</p>
                  )}
                </div>
              )}
            </div>

            <InteractiveSurface
              type="button"
              intent="primary"
              pressScale={0.97}
              onClick={handleFlip}
              className="w-full min-h-[56px] rounded-[var(--radius-card)] bg-[#4D3EA3] text-white text-base font-bold hover:bg-[#3f328b] flex items-center justify-center gap-2"
            >
              <RotateCw size={18} aria-hidden="true" />
              Reveal Meaning &amp; Kanji
            </InteractiveSurface>
          </article>

          {/* BACK FACE */}
          <article
            key={`back:${currentCard.id}:${flipped}`}
            aria-hidden={!flipped}
            inert={!flipped}
            className={
              !flipped
                ? 'invisible absolute inset-0 pointer-events-none overflow-hidden'
                : 'kotoba-card-face rounded-[var(--radius-hero)] bg-[#1D1D1F] text-white p-5 shadow-[var(--shadow-medium)] space-y-4'
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-[var(--radius-chip)] bg-white/14 text-white text-xs font-bold tabular-nums">
                  CH 0{currentCard.chapter} · p.{currentCard.pdfPage}
                </span>
                <span className="text-xs font-semibold text-[#B4B4B8]">
                  {KOTOBA_CATEGORY_LABELS[currentCard.category]}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <TTSButton
                  text={currentCard.ttsText}
                  ariaLabel="Listen to word pronunciation"
                  variant="dark"
                />
                <InteractiveSurface
                  type="button"
                  intent="caution"
                  pressScale={0.94}
                  feedbackKey={currentState?.bookmarked ? `${currentCard.id}:bm` : null}
                  onClick={() =>
                    void toggleKotobaBookmark(currentCard.id, currentCard.chapter, currentCard.category)
                  }
                  ariaPressed={Boolean(currentState?.bookmarked)}
                  ariaLabel={currentState?.bookmarked ? 'Remove bookmark' : 'Bookmark word'}
                  className={[
                    'inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] shrink-0',
                    currentState?.bookmarked
                      ? 'bg-[#FF7A1A] text-[#1D1D1F]'
                      : 'bg-white/14 text-white hover:bg-white/22',
                  ].join(' ')}
                >
                  <SemanticIcon behavior="pop-fill" active={Boolean(currentState?.bookmarked)}>
                    <Bookmark
                      size={20}
                      fill={currentState?.bookmarked ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                  </SemanticIcon>
                </InteractiveSurface>
                <button
                  type="button"
                  onClick={handleFlip}
                  className="inline-flex items-center justify-center min-w-[48px] min-h-[48px] px-3 rounded-[var(--radius-chip)] bg-white/14 text-white text-xs font-bold hover:bg-white/22"
                >
                  Front
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-3xl font-bold leading-[1.7] text-white">
                <FuriganaText
                  jaRuby={currentCard.word.jaRuby}
                  jaPlain={currentCard.word.jaPlain}
                  mode={settings.furiganaMode}
                  darkSurface
                />
              </div>
              <p lang="ja" className="text-sm text-[#FFD2F4] font-semibold">
                {currentCard.readingKana}
                {currentCard.romaji ? ` · ${currentCard.romaji}` : ''}
              </p>
              <div className="pt-1 space-y-1">
                {settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en' || settings.langPreset === 'jp_only' ? (
                  <p className="text-base font-bold text-white">{currentCard.word.id}</p>
                ) : null}
                {settings.langPreset === 'jp_en' || settings.langPreset === 'jp_id_en' ? (
                  <p className="text-sm text-[#B4B4B8]">{currentCard.word.en}</p>
                ) : null}
              </div>
            </div>

            {currentCard.kanjiBreakdown && currentCard.kanjiBreakdown.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-white/12">
                <span className="eyebrow text-[#FFD2F4]">Kanji Breakdown</span>
                <div className="grid grid-cols-2 gap-2">
                  {currentCard.kanjiBreakdown.map((part, pIdx) => (
                    <div
                      key={`${part.char}:${pIdx}`}
                      className="rounded-[16px] bg-white/8 border border-white/12 p-2.5 space-y-1"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span lang="ja" className="text-2xl font-bold text-[#FFD2F4]">
                          {part.char}
                        </span>
                        <span lang="ja" className="text-[11px] font-semibold text-[#B4B4B8] text-right">
                          {part.on !== '-' ? `音 ${part.on}` : ''}
                          {part.kun !== '-' ? `${part.on !== '-' ? ' / ' : ''}訓 ${part.kun}` : ''}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white leading-snug">
                        {settings.langPreset === 'jp_en' ? part.meaningEn : part.meaningId}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {currentCard.example ? (
              <div className="rounded-[var(--radius-card)] bg-white/8 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow text-[#E1DAFB]">Example Usage</span>
                  <TTSButton
                    text={currentCard.example.jaPlain}
                    ariaLabel="Listen to example sentence"
                    variant="dark"
                  />
                </div>
                <TrilingualBlock
                  text={currentCard.example}
                  furiganaMode={settings.furiganaMode}
                  langPreset={settings.langPreset}
                  darkSurface
                  jaClassName="text-sm font-bold leading-[1.7]"
                  secondaryClassName="text-xs leading-relaxed"
                />
              </div>
            ) : null}

            {currentCard.confusableWith && currentCard.confusableWith.length > 0 ? (
              <div className="rounded-[var(--radius-card)] bg-[#450C3F]/80 border border-[#FFD2F4]/30 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFD2F4]">
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span>Exam Trap / Confusable Words</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentCard.confusableWith.map((trapId) => {
                    const trap = cardById.get(trapId);
                    if (!trap) return null;
                    return (
                      <button
                        key={trap.id}
                        type="button"
                        onClick={() => handleJumpToCard(trap.id)}
                        className="min-h-[48px] px-3 rounded-[var(--radius-chip)] bg-white/14 hover:bg-white/24 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span lang="ja" className="font-bold">
                          {trap.word.jaPlain}
                        </span>
                        <span className="text-[#B4B4B8]">({trap.readingKana})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </article>

          {/* FREE PRACTICE BOTTOM BAR */}
          {studyMode === 'free' ? (
            <div className="grid grid-cols-3 gap-2 pt-3">
              <button
                type="button"
                onClick={() => handleStepFree(-1)}
                className="min-h-[48px] px-3 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] border border-black/10 shadow-[var(--shadow-soft)] text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Prev
              </button>
              <button
                type="button"
                onClick={handleFlip}
                className="min-h-[48px] px-3 rounded-[var(--radius-chip)] bg-[#4D3EA3] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <RotateCw size={15} aria-hidden="true" />
                {flipped ? 'Front' : 'Flip'}
              </button>
              <button
                type="button"
                onClick={() => handleStepFree(1)}
                className="min-h-[48px] px-3 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                Next
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* FIXED SRS RATING DOCK */}
      {studyMode === 'srs' && currentCard && flipped ? (
        <div
          role="region"
          aria-label="Recall rating controls"
          style={{
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            width: 'min(calc(100% - 24px), 460px)',
          }}
          className="fixed left-1/2 -translate-x-1/2 z-40 grid grid-cols-4 gap-2 p-2 rounded-[24px] bg-white/95 border border-black/10 shadow-[var(--shadow-medium)]"
        >
          <InteractiveSurface
            type="button"
            intent="negative"
            pressScale={0.95}
            onClick={() => void handleRate('again')}
            style={{ backgroundColor: 'var(--status-again)' }}
            className="min-h-[56px] rounded-[16px] text-white px-2 py-2 flex flex-col items-center justify-center hover:brightness-95"
          >
            <span className="text-xs font-bold">Again</span>
            <span className="text-[11px] font-semibold opacity-95 tabular-nums">
              {previews.again}
            </span>
          </InteractiveSurface>

          <InteractiveSurface
            type="button"
            intent="caution"
            pressScale={0.95}
            onClick={() => void handleRate('hard')}
            style={{ backgroundColor: 'var(--status-hard)' }}
            className="min-h-[56px] rounded-[16px] text-[#1D1D1F] px-2 py-2 flex flex-col items-center justify-center hover:brightness-95"
          >
            <span className="text-xs font-bold">Hard</span>
            <span className="text-[11px] font-semibold tabular-nums">{previews.hard}</span>
          </InteractiveSurface>

          <InteractiveSurface
            type="button"
            intent="positive"
            pressScale={0.95}
            onClick={() => void handleRate('good')}
            style={{ backgroundColor: 'var(--status-good)' }}
            className="min-h-[56px] rounded-[16px] text-white px-2 py-2 flex flex-col items-center justify-center hover:brightness-95"
          >
            <span className="text-xs font-bold">Good</span>
            <span className="text-[11px] font-semibold opacity-95 tabular-nums">
              {previews.good}
            </span>
          </InteractiveSurface>

          <InteractiveSurface
            type="button"
            intent="primary"
            pressScale={0.95}
            onClick={() => void handleRate('easy')}
            style={{ backgroundColor: 'var(--status-easy)' }}
            className="min-h-[56px] rounded-[16px] text-[#1D1D1F] px-2 py-2 flex flex-col items-center justify-center hover:brightness-95"
          >
            <span className="text-xs font-bold">Easy</span>
            <span className="text-[11px] font-semibold tabular-nums">{previews.easy}</span>
          </InteractiveSurface>
        </div>
      ) : null}

      <KotobaFilterDialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          setFreeIdx(0);
          setFlipped(false);
        }}
        matchedCount={filteredCards.length}
      />

      <KotobaIndexDialog
        open={indexOpen}
        onClose={() => setIndexOpen(false)}
        cards={ALL_KOTOBA_CARDS}
        statesById={kotobaMap}
        langPreset={settings.langPreset}
        onJumpToCard={handleJumpToCard}
      />
    </div>
  );
}
