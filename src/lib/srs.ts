import type { ChapterId, SRSCardState, SRSRating } from './types';

export const DAY_MS = 86_400_000;
export const RELEARN_MS = 60_000;
export const MIN_EASE_FACTOR = 1.3;
export const INITIAL_EASE_FACTOR = 2.5;

export function createInitialSRSState(
  cardId: string,
  chapter: ChapterId,
  nowMs = 0
): SRSCardState {
  return {
    cardId,
    chapter,
    repetitions: 0,
    intervalDays: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    lapses: 0,
    correctCount: 0,
    reviewCount: 0,
    dueTimestamp: nowMs,
    lastReviewedAt: null,
    bookmarked: false,
  };
}

export function formatIntervalLabel(intervalDays: number): string {
  if (intervalDays <= 0) return '<1m';
  if (intervalDays < 1) {
    return `${Math.round(intervalDays * 24)}h`;
  }
  if (intervalDays < 30) {
    return `${intervalDays}d`;
  }
  if (intervalDays < 365) {
    return `${Math.round(intervalDays / 30)}mo`;
  }
  return `${Math.round(intervalDays / 365)}y`;
}

export function scheduleCard(
  prev: SRSCardState,
  rating: SRSRating,
  nowMs: number
): { next: SRSCardState; nextLabel: string } {
  let repetitions = prev.repetitions;
  let intervalDays = prev.intervalDays;
  let easeFactor = prev.easeFactor;
  let lapses = prev.lapses;
  let correctCount = prev.correctCount;
  let dueTimestamp = nowMs;
  let nextLabel = '<1m';

  if (rating === 'again') {
    repetitions = 0;
    intervalDays = 0;
    lapses = prev.lapses + 1;
    easeFactor = Math.max(MIN_EASE_FACTOR, Number((prev.easeFactor - 0.2).toFixed(4)));
    dueTimestamp = nowMs + RELEARN_MS;
    nextLabel = '<1m';
  } else if (rating === 'hard') {
    if (prev.repetitions === 0) {
      intervalDays = 0.5;
      repetitions = 1;
      nextLabel = '12h';
    } else {
      intervalDays = Math.max(1, Math.round(prev.intervalDays * 1.2));
      repetitions = prev.repetitions + 1;
      nextLabel = formatIntervalLabel(intervalDays);
    }
    easeFactor = Math.max(MIN_EASE_FACTOR, Number((prev.easeFactor - 0.15).toFixed(4)));
    dueTimestamp = nowMs + intervalDays * DAY_MS;
    correctCount += 1;
  } else if (rating === 'good') {
    if (prev.repetitions === 0) {
      intervalDays = 1;
    } else if (prev.repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(prev.intervalDays * prev.easeFactor));
    }
    repetitions = prev.repetitions + 1;
    easeFactor = prev.easeFactor;
    dueTimestamp = nowMs + intervalDays * DAY_MS;
    nextLabel = formatIntervalLabel(intervalDays);
    correctCount += 1;
  } else {
    if (prev.repetitions === 0) {
      intervalDays = 4;
    } else {
      intervalDays = Math.max(1, Math.round(prev.intervalDays * prev.easeFactor * 1.3));
    }
    repetitions = prev.repetitions + 1;
    easeFactor = Number((prev.easeFactor + 0.15).toFixed(4));
    dueTimestamp = nowMs + intervalDays * DAY_MS;
    nextLabel = formatIntervalLabel(intervalDays);
    correctCount += 1;
  }

  return {
    next: {
      ...prev,
      repetitions,
      intervalDays,
      easeFactor,
      lapses,
      correctCount,
      reviewCount: prev.reviewCount + 1,
      dueTimestamp,
      lastReviewedAt: nowMs,
    },
    nextLabel,
  };
}

export function getRatingPreviews(
  prev: SRSCardState,
  nowMs: number
): Record<SRSRating, string> {
  return {
    again: scheduleCard(prev, 'again', nowMs).nextLabel,
    hard: scheduleCard(prev, 'hard', nowMs).nextLabel,
    good: scheduleCard(prev, 'good', nowMs).nextLabel,
    easy: scheduleCard(prev, 'easy', nowMs).nextLabel,
  };
}
