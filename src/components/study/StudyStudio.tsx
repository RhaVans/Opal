'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Bookmark, RotateCw } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ALL_FLASHCARDS } from '@/lib/curriculum';
import { createInitialSRSState, getRatingPreviews } from '@/lib/srs';
import { isCardWeakSpot } from '@/lib/analytics';
import { speakJapanese, stopSpeaking } from '@/lib/tts';
import type { ChapterId, FlashcardItem, FuriganaMode, LangPreset, SRSRating } from '@/lib/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Chip } from '@/components/ui/Chip';
import { Sparkle } from '@/components/ui/Sparkle';
import { TTSButton } from '@/components/text/TTSButton';
import { TrilingualBlock } from '@/components/text/TrilingualBlock';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { SemanticIcon } from '@/components/motion/SemanticIcon';
import { StateTransition } from '@/components/motion/StateTransition';
import { emitFeedback } from '@/lib/motion/feedbackBus';
import type { InteractionIntent } from '@/lib/motion/tokens';

const RATING_INTENT: Record<SRSRating, InteractionIntent> = {
  again: 'negative',
  hard: 'caution',
  good: 'positive',
  easy: 'primary',
};

const LANG_ORDER: LangPreset[] = ['jp_id', 'jp_en', 'jp_id_en', 'jp_only'];
const LANG_LABEL: Record<LangPreset, string> = {
  jp_id: 'JP+ID',
  jp_en: 'JP+EN',
  jp_id_en: 'JP+ID+EN',
  jp_only: 'JP',
};

export function StudyStudio() {
  const searchParams = useSearchParams();
  const {
    hydrated,
    settings,
    srsMap,
    ttsAvailability,
    ttsTipDismissed,
    dismissTtsTip,
    updateSettings,
    reviewCard,
    toggleBookmark,
  } = useApp();

  const chapterParam = searchParams.get('chapter');
  const explicitMode = searchParams.get('mode');
  const parsedChapter = chapterParam ? (Number(chapterParam) as ChapterId) : null;
  const modeParam = explicitMode || (parsedChapter ? 'all' : 'due');
  const sessionKey = `${parsedChapter ?? 'all'}:${modeParam}`;

  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cardShownAtRef = useRef<number>(Date.now());
  const ratingPendingRef = useRef(false);
  const lastAutoSpokenKeyRef = useRef<string | null>(null);
  const prevSessionKeyRef = useRef<string>(sessionKey);

  // Reset session when URL query filters change across client navigation
  useEffect(() => {
    if (prevSessionKeyRef.current !== sessionKey) {
      prevSessionKeyRef.current = sessionKey;
      stopSpeaking();
      lastAutoSpokenKeyRef.current = null;
      ratingPendingRef.current = false;
      setQueueIds(null);
      setReviewedCount(0);
      setFlipped(false);
    }
  }, [sessionKey]);

  // Build initial session queue once hydrated
  useEffect(() => {
    if (!hydrated || queueIds !== null) return;
    const nowMs = Date.now();

    let pool = ALL_FLASHCARDS;
    if (parsedChapter && [1, 2, 3, 4, 5].includes(parsedChapter)) {
      pool = pool.filter((c) => c.chapter === parsedChapter);
    }

    if (modeParam === 'weak') {
      pool = pool.filter((c) => isCardWeakSpot(srsMap.get(c.id)));
    } else if (modeParam === 'bookmarked') {
      pool = pool.filter((c) => Boolean(srsMap.get(c.id)?.bookmarked));
    } else if (modeParam === 'due') {
      pool = pool.filter((c) => {
        const st = srsMap.get(c.id);
        return !st || st.dueTimestamp <= nowMs;
      });
    }

    setQueueIds(pool.map((c) => c.id));
    cardShownAtRef.current = Date.now();
  }, [hydrated, queueIds, parsedChapter, modeParam, srsMap]);

  const cardById = useMemo(
    () => new Map<string, FlashcardItem>(ALL_FLASHCARDS.map((c) => [c.id, c])),
    []
  );

  const currentCard =
    queueIds && queueIds.length > 0 ? cardById.get(queueIds[0]) ?? null : null;

  const currentState = useMemo(() => {
    if (!currentCard) return null;
    return srsMap.get(currentCard.id) ?? createInitialSRSState(currentCard.id, currentCard.chapter, Date.now());
  }, [currentCard, srsMap]);

  const previews = useMemo(() => {
    if (!currentState) return { again: '<1m', hard: '12h', good: '1d', easy: '4d' };
    return getRatingPreviews(currentState, Date.now());
  }, [currentState]);

  // Autoplay speaks visible front question, then answer once revealed
  useEffect(() => {
    if (!currentCard || !settings.ttsAutoPlay) return;
    const sideKey = `${currentCard.id}:${flipped ? 'back' : 'front'}`;
    if (lastAutoSpokenKeyRef.current === sideKey) return;
    lastAutoSpokenKeyRef.current = sideKey;
    const textToSpeak = flipped ? currentCard.answer.jaPlain : currentCard.prompt.jaPlain;
    speakJapanese(textToSpeak, settings.ttsRate);
  }, [currentCard, flipped, settings.ttsAutoPlay, settings.ttsRate]);

  const handleRate = useCallback(
    async (rating: SRSRating) => {
      if (!currentCard || !queueIds || ratingPendingRef.current) return;
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
        const elapsedSec = Math.max(2, (Date.now() - cardShownAtRef.current) / 1000);
        await reviewCard(currentCard.id, currentCard.chapter, rating, elapsedSec);

        setQueueIds((prev) => {
          if (!prev || prev.length === 0) return [];
          const [head, ...rest] = prev;
          if (rating === 'again') {
            const insertIdx = Math.min(rest.length, 3);
            const nextQueue = [...rest];
            nextQueue.splice(insertIdx, 0, head);
            return nextQueue;
          }
          return rest;
        });

        setReviewedCount((c) => c + 1);
        setFlipped(false);
        cardShownAtRef.current = Date.now();
      } finally {
        ratingPendingRef.current = false;
      }
    },
    [currentCard, queueIds, reviewCard]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!currentCard) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (!flipped && document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          setFlipped(true);
        }
      } else if (flipped) {
        if (e.key === '1') void handleRate('again');
        else if (e.key === '2') void handleRate('hard');
        else if (e.key === '3') void handleRate('good');
        else if (e.key === '4') void handleRate('easy');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentCard, flipped, handleRate]);

  const cycleLangPreset = () => {
    const idx = LANG_ORDER.indexOf(settings.langPreset);
    const next = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
    void updateSettings({ langPreset: next });
  };

  const totalRemaining = queueIds?.length ?? 0;
  const totalSession = reviewedCount + totalRemaining;
  const progressPct = totalSession === 0 ? 100 : Math.round((reviewedCount / totalSession) * 100);

  return (
    <div className="space-y-4 pb-36 route-enter">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/chapters"
            aria-label="Back to chapters"
            className="inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] shadow-[var(--shadow-soft)] hover:bg-[#F5F5F7] shrink-0"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>

          <SegmentedControl<FuriganaMode>
            ariaLabel="Furigana display mode"
            value={settings.furiganaMode}
            onChange={(m) => void updateSettings({ furiganaMode: m })}
            options={[
              { value: 'on', label: 'On' },
              { value: 'peek', label: 'Peek' },
              { value: 'off', label: 'Off' },
            ]}
          />

          <Chip onClick={cycleLangPreset} aria-label={`Switch language preset, current ${LANG_LABEL[settings.langPreset]}`}>
            {LANG_LABEL[settings.langPreset]}
          </Chip>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B5B62] tabular-nums">
            <span>
              {parsedChapter ? `Chapter 0${parsedChapter}` : modeParam.toUpperCase()}
            </span>
            <span>
              {reviewedCount} done · {totalRemaining} left
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className="w-full h-full rounded-full bg-[#4D3EA3] origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${progressPct / 100})` }}
            />
          </div>
        </div>
      </header>

      {!ttsAvailability.hasJapaneseVoice && !ttsTipDismissed ? (
        <div
          role="status"
          className="rounded-[var(--radius-card)] bg-[#FFD2F4] text-[#450C3F] p-3.5 text-xs flex items-center justify-between gap-3"
        >
          <p className="font-medium">
            No offline Japanese (ja-JP) TTS voice detected. Install Japanese speech data in Android/OS accessibility or language settings for offline audio.
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

      {!hydrated || queueIds === null ? (
        <div
          aria-busy="true"
          className="rounded-[var(--radius-hero)] bg-white p-8 text-center text-sm text-[#5B5B62] shadow-[var(--shadow-soft)]"
        >
          Preparing flashcard queue...
        </div>
      ) : !currentCard ? (
        <section className="rounded-[var(--radius-hero)] bg-white p-7 text-center shadow-[var(--shadow-medium)] space-y-4">
          <div className="w-12 h-12 mx-auto rounded-[var(--radius-icon)] bg-[#E1DAFB] flex items-center justify-center">
            <Sparkle size={24} color="#4D3EA3" />
          </div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">
            {reviewedCount > 0 ? 'Session complete' : 'No matching cards in this queue'}
          </h1>
          <p className="text-sm text-[#5B5B62]">
            {reviewedCount > 0
              ? `You completed ${reviewedCount} active recall reviews.`
              : 'Try another filter or select a chapter to practice.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/chapters"
              className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-semibold"
            >
              Browse Chapters
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#E1DAFB] text-[#4D3EA3] text-sm font-semibold"
            >
              Home
            </Link>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          <h1 className="sr-only">Active Recall Flashcard Studio</h1>

          <StateTransition keyId={currentCard.id} direction="forward">
            <article
              className={[
                'rounded-[var(--radius-hero)] p-5 shadow-[var(--shadow-medium)] transition-colors space-y-4',
                flipped ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#1D1D1F]',
              ].join(' ')}
            >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={[
                    'inline-flex items-center px-3 py-1 rounded-[var(--radius-chip)] text-xs font-bold tabular-nums',
                    flipped ? 'bg-white/14 text-white' : 'bg-[#E1DAFB] text-[#4D3EA3]',
                  ].join(' ')}
                >
                  p.{currentCard.pdfPage}
                </span>
                <span
                  className={[
                    'text-xs font-semibold',
                    flipped ? 'text-[#B4B4B8]' : 'text-[#5B5B62]',
                  ].join(' ')}
                >
                  {currentCard.section}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <TTSButton
                  text={currentCard.prompt.jaPlain}
                  ariaLabel="Listen to question pronunciation"
                  variant={flipped ? 'dark' : 'light'}
                />
                <InteractiveSurface
                  type="button"
                  intent="caution"
                  pressScale={0.94}
                  feedbackKey={currentState?.bookmarked ? `${currentCard.id}:bm` : null}
                  onClick={() => void toggleBookmark(currentCard.id, currentCard.chapter)}
                  ariaPressed={Boolean(currentState?.bookmarked)}
                  ariaLabel={currentState?.bookmarked ? 'Remove bookmark' : 'Bookmark card'}
                  className={[
                    'inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] shrink-0',
                    currentState?.bookmarked
                      ? 'bg-[#FF7A1A] text-[#1D1D1F]'
                      : flipped
                        ? 'bg-white/14 text-white hover:bg-white/22'
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

            <div className="py-2">
              <TrilingualBlock
                text={currentCard.prompt}
                furiganaMode={settings.furiganaMode}
                langPreset={settings.langPreset}
                darkSurface={flipped}
                jaClassName="kanji-prompt"
              />
            </div>

            {!flipped ? (
              <div className="pt-2">
                <InteractiveSurface
                  type="button"
                  intent="primary"
                  pressScale={0.97}
                  onClick={() => setFlipped(true)}
                  className="w-full min-h-[56px] rounded-[var(--radius-card)] bg-[#4D3EA3] text-white text-base font-bold hover:bg-[#3f328b] flex items-center justify-center gap-2"
                >
                  <RotateCw size={18} aria-hidden="true" />
                  Reveal Answer
                </InteractiveSurface>
              </div>
            ) : (
              <div className="pt-4 border-t border-white/15 space-y-4 reveal-panel">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="eyebrow text-[#FFD2F4]">Answer</span>
                    <TTSButton
                      text={currentCard.answer.jaPlain}
                      ariaLabel="Listen to answer pronunciation"
                      variant="dark"
                    />
                  </div>
                  <TrilingualBlock
                    text={currentCard.answer}
                    furiganaMode={settings.furiganaMode}
                    langPreset={settings.langPreset}
                    darkSurface
                    jaClassName="text-xl font-bold leading-[1.85]"
                    secondaryClassName="text-sm leading-relaxed"
                  />
                </div>

                {currentCard.examTip ? (
                  <div className="rounded-[var(--radius-card)] bg-white/10 p-3.5 space-y-1">
                    <span className="eyebrow text-[#FFD2F4]">Exam Tip</span>
                    {settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en' ? (
                      <p className="text-xs text-white leading-relaxed">{currentCard.examTip.id}</p>
                    ) : null}
                    {settings.langPreset === 'jp_en' ||
                    settings.langPreset === 'jp_id_en' ||
                    settings.langPreset === 'jp_only' ? (
                      <p className="text-xs text-[#B4B4B8] leading-relaxed">
                        {currentCard.examTip.en}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
            </article>
          </StateTransition>
        </div>
      )}

      {currentCard && flipped ? (
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
    </div>
  );
}
