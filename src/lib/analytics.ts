import type {
  CBTAttemptRecord,
  ChapterId,
  DailyActivityLog,
  DrillProgressRecord,
  FlashcardItem,
  SRSCardState,
} from './types';
import { DAY_MS } from './srs';

export interface ChapterStats {
  chapter: ChapterId;
  total: number;
  mature: number;
  learning: number;
  due: number;
  weak: number;
  masteredDisplay: number;
  pct: number;
}

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function isCardWeakSpot(state: SRSCardState | undefined): boolean {
  if (!state) return false;
  if (state.lapses >= 2) return true;
  if (state.reviewCount >= 3 && state.correctCount / state.reviewCount < 0.6) {
    return true;
  }
  return false;
}

export function computeChapterStats(
  chapter: ChapterId,
  cards: FlashcardItem[],
  statesById: Map<string, SRSCardState>,
  nowMs: number
): ChapterStats {
  const chapterCards = cards.filter((c) => c.chapter === chapter);
  const total = chapterCards.length;
  let mature = 0;
  let learning = 0;
  let due = 0;
  let weak = 0;

  for (const card of chapterCards) {
    const st = statesById.get(card.id);
    if (!st) {
      due += 1;
      continue;
    }
    if (st.dueTimestamp <= nowMs) {
      due += 1;
    }
    if (st.intervalDays >= 7) {
      mature += 1;
    } else if (st.repetitions >= 1) {
      learning += 1;
    }
    if (isCardWeakSpot(st)) {
      weak += 1;
    }
  }

  const pct = total === 0 ? 0 : Math.round(((mature * 1.0 + learning * 0.4) / total) * 100);
  return {
    chapter,
    total,
    mature,
    learning,
    due,
    weak,
    masteredDisplay: mature,
    pct,
  };
}

export function computeOverallMasteryPct(
  cards: FlashcardItem[],
  statesById: Map<string, SRSCardState>
): number {
  const total = cards.length;
  if (total === 0) return 0;
  let weighted = 0;
  for (const card of cards) {
    const st = statesById.get(card.id);
    if (!st) continue;
    if (st.intervalDays >= 7) weighted += 1.0;
    else if (st.repetitions >= 1) weighted += 0.4;
  }
  return Math.round((weighted / total) * 100);
}

export function computeExamReadiness(
  overallMasteryPct: number,
  cbtAttempts: CBTAttemptRecord[],
  drillProgress: DrillProgressRecord[]
): {
  readinessPct: number;
  masteryPct: number;
  avgCbtPct: number;
  drillCompletionPct: number;
} {
  const last5 = [...cbtAttempts]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
  const avgCbtPct =
    last5.length === 0
      ? 0
      : Math.round(
          last5.reduce(
            (sum, a) => sum + (a.correctCount / Math.max(1, a.totalQuestions)) * 100,
            0
          ) / last5.length
        );

  const completedDrills = drillProgress.filter((d) => d.completedCount >= 1).length;
  const drillCompletionPct = Math.round((Math.min(4, completedDrills) / 4) * 100);

  const readinessPct = Math.round(
    0.5 * overallMasteryPct + 0.35 * avgCbtPct + 0.15 * drillCompletionPct
  );

  return {
    readinessPct,
    masteryPct: overallMasteryPct,
    avgCbtPct,
    drillCompletionPct,
  };
}

export function computeStreak(
  logs: DailyActivityLog[],
  todayDate: Date = new Date()
): number {
  const activeDays = new Set<string>();
  for (const log of logs) {
    if (log.reviewsCompleted + log.cbtAnswered + log.drillsCompleted >= 1) {
      activeDays.add(log.dateKey);
    }
  }
  if (activeDays.size === 0) return 0;

  const todayKey = getLocalDateKey(todayDate);
  let cursor = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate(),
    12,
    0,
    0,
    0
  );

  // If today has no logged activity yet, keep yesterday's active streak intact until midnight.
  if (!activeDays.has(todayKey)) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!activeDays.has(getLocalDateKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (activeDays.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

export function getLast7DaysSummary(
  logs: DailyActivityLog[],
  todayDate: Date = new Date()
): Array<{
  dateKey: string;
  dayShort: string;
  reviews: number;
  minutes: number;
  isToday: boolean;
}> {
  const byKey = new Map(logs.map((l) => [l.dateKey, l]));
  const out: Array<{
    dateKey: string;
    dayShort: string;
    reviews: number;
    minutes: number;
    isToday: boolean;
  }> = [];

  const base = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate(),
    12,
    0,
    0,
    0
  );
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(base.getTime() - offset * DAY_MS);
    const key = getLocalDateKey(d);
    const entry = byKey.get(key);
    const reviews = entry
      ? entry.reviewsCompleted + entry.cbtAnswered + entry.drillsCompleted
      : 0;
    const minutes = entry ? Math.round(entry.studySeconds / 60) : 0;
    out.push({
      dateKey: key,
      dayShort: weekdayLabels[d.getDay()],
      reviews,
      minutes,
      isToday: offset === 0,
    });
  }
  return out;
}
