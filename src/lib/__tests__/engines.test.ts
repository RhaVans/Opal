import { describe, expect, it } from 'vitest';
import {
  createInitialKotobaState,
  createInitialSRSState,
  getRatingPreviews,
  MIN_EASE_FACTOR,
  scheduleCard,
} from '../srs';
import {
  generateAdrProblem,
  generateMathSprint,
  generateOccProblem,
  generateRevparProblem,
  isNumericAnswerMatch,
  parseNumericAnswerInput,
} from '../mathGenerator';
import { getGreetingForPreset } from '../chapters';
import { formatJapaneseForTTS } from '../tts';
import { emitFeedback, subscribeFeedback } from '../motion/feedbackBus';
import { DURATIONS, INTENT_SHADER_RGB, type FeedbackSignal } from '../motion/tokens';
import {
  computeChapterStats,
  computeExamReadiness,
  computeKotobaSummary,
  computeStreak,
  getLocalDateKey,
  getStreakCycleDays,
  isCardWeakSpot,
} from '../analytics';
import { ALL_KOTOBA_CARDS } from '../curriculum';
import { buildKotobaQuiz, filterKotobaCards } from '../kotoba';
import { hasMalformedHtmlOutsideRuby, parseRubyTokens } from '../furigana';

describe('SM-2 SRS engine', () => {
  const now = 1_700_000_000_000;

  it('schedules unseen card for all 4 ratings accurately', () => {
    const fresh = createInitialSRSState('ch01_001', 1, now);
    const previews = getRatingPreviews(fresh, now);
    expect(previews).toEqual({
      again: '<1m',
      hard: '12h',
      good: '1d',
      easy: '4d',
    });

    const againRes = scheduleCard(fresh, 'again', now);
    expect(againRes.next.repetitions).toBe(0);
    expect(againRes.next.lapses).toBe(1);
    expect(againRes.next.easeFactor).toBe(2.3);
    expect(againRes.next.dueTimestamp).toBe(now + 60_000);

    const good1 = scheduleCard(fresh, 'good', now);
    expect(good1.next.intervalDays).toBe(1);
    expect(good1.next.repetitions).toBe(1);

    const good2 = scheduleCard(good1.next, 'good', now);
    expect(good2.next.intervalDays).toBe(6);
    expect(good2.next.repetitions).toBe(2);

    const good3 = scheduleCard(good2.next, 'good', now);
    expect(good3.next.intervalDays).toBe(15);
    expect(good3.nextLabel).toBe('15d');
  });

  it('enforces ease factor floor of 1.3', () => {
    let state = createInitialSRSState('ch01_002', 1, now);
    for (let i = 0; i < 12; i++) {
      state = scheduleCard(state, 'again', now).next;
    }
    expect(state.easeFactor).toBe(MIN_EASE_FACTOR);
  });
});

describe('Math generator', () => {
  it('generates clean exact OCC, ADR, and RevPAR problems without float artifacts', () => {
    const fixedRng = () => 0.37;
    const occ = generateOccProblem(1, fixedRng);
    const adr = generateAdrProblem(2, fixedRng);
    const rev = generateRevparProblem(3, fixedRng);

    expect(Number.isInteger(occ.answer * 10)).toBe(true);
    expect(Number.isInteger(adr.answer)).toBe(true);
    expect(Number.isInteger(rev.answer)).toBe(true);

    const sprint = generateMathSprint(10, fixedRng);
    expect(sprint).toHaveLength(10);
    for (const q of sprint) {
      expect(isNumericAnswerMatch(String(q.answer), q.answer)).toBe(true);
    }
  });
});

describe('Analytics & Leech detection', () => {
  it('computes leech weak spots, chapter mastery, readiness, and local streak', () => {
    const s1 = { ...createInitialSRSState('c1', 1, 0), lapses: 2, reviewCount: 3, correctCount: 1 };
    const s2 = { ...createInitialSRSState('c2', 1, 0), intervalDays: 10, repetitions: 3, reviewCount: 3, correctCount: 3 };
    expect(isCardWeakSpot(s1)).toBe(true);
    expect(isCardWeakSpot(s2)).toBe(false);

    const cards = [
      { id: 'c1', chapter: 1 },
      { id: 'c2', chapter: 1 },
    ] as Parameters<typeof computeChapterStats>[1];
    const map = new Map([
      ['c1', s1],
      ['c2', s2],
    ]);
    const stats = computeChapterStats(1, cards, map, 1000);
    expect(stats.mature).toBe(1);
    expect(stats.weak).toBe(1);
    expect(stats.pct).toBe(50);

    const readiness = computeExamReadiness(
      60,
      [
        {
          id: 'a1',
          timestamp: 100,
          mode: 'exam',
          chaptersIncluded: [1, 2, 3, 4, 5],
          totalQuestions: 10,
          correctCount: 8,
          wrongQuestionIds: [],
          durationSec: 120,
        },
      ],
      [
        { drillId: 'sequence', bestAccuracy: 100, completedCount: 1, lastPlayedAt: 100 },
        { drillId: 'table', bestAccuracy: 90, completedCount: 1, lastPlayedAt: 100 },
      ]
    );
    // 0.5*60 + 0.35*80 + 0.15*50 = 30 + 28 + 7.5 = 65.5 -> 66
    expect(readiness.readinessPct).toBe(66);

    const today = new Date(2026, 10, 25, 14, 0, 0);
    const d0 = getLocalDateKey(today);
    const d1 = getLocalDateKey(new Date(2026, 10, 24, 14, 0, 0));
    const d2 = getLocalDateKey(new Date(2026, 10, 23, 14, 0, 0));
    const streak = computeStreak(
      [
        { dateKey: d0, reviewsCompleted: 3, cbtAnswered: 0, drillsCompleted: 0, studySeconds: 60 },
        { dateKey: d1, reviewsCompleted: 0, cbtAnswered: 5, drillsCompleted: 0, studySeconds: 60 },
        { dateKey: d2, reviewsCompleted: 0, cbtAnswered: 0, drillsCompleted: 1, studySeconds: 60 },
      ],
      today
    );
    expect(streak).toBe(3);
  });

  it('computes 7-day rolling streak cycle badges cleanly across milestones', () => {
    const zero = getStreakCycleDays(0);
    expect(zero).toHaveLength(7);
    expect(zero.every((d) => !d.completed)).toBe(true);
    expect(zero[0].label).toBe('Day 1');

    const two = getStreakCycleDays(2);
    expect(two.filter((d) => d.completed).map((d) => d.label)).toEqual(['Day 1', 'Day 2']);
    expect(two[6].label).toBe('Day 7');

    const eight = getStreakCycleDays(8);
    expect(eight[0]).toEqual({ dayNumber: 8, label: 'Day 8', completed: true });
    expect(eight[1]).toEqual({ dayNumber: 9, label: 'Day 9', completed: false });
  });
});

describe('Furigana parser', () => {
  it('parses strictly <ruby><rt> tokens and detects stray HTML', () => {
    const tokens = parseRubyTokens('<ruby>空室<rt>くうしつ</rt></ruby>と<ruby>満室<rt>まんしつ</rt></ruby>');
    expect(tokens).toEqual([
      { type: 'ruby', base: '空室', reading: 'くうしつ' },
      { type: 'text', text: 'と' },
      { type: 'ruby', base: '満室', reading: 'まんしつ' },
    ]);
    expect(hasMalformedHtmlOutsideRuby('<ruby>空室<rt>くうしつ</rt></ruby>')).toBe(false);
    expect(hasMalformedHtmlOutsideRuby('<script>alert(1)</script>')).toBe(true);
  });
});

describe('Comma numeric matching, Concierge greeting, and TTS normalization', () => {
  it('supports Indonesian decimal comma and English thousands comma without conflating 62,5 with 625', () => {
    expect(parseNumericAnswerInput('62,5')).toBe(62.5);
    expect(parseNumericAnswerInput('62.5')).toBe(62.5);
    expect(parseNumericAnswerInput('15,000')).toBe(15000);
    expect(parseNumericAnswerInput('2,250,000')).toBe(2250000);
    expect(isNumericAnswerMatch('62,5', 62.5)).toBe(true);
    expect(isNumericAnswerMatch('62,5', 625)).toBe(false);
    expect(isNumericAnswerMatch('15,000', 15000)).toBe(true);
    expect(isNumericAnswerMatch('1,2,3', 123)).toBe(false);
  });

  it('uses Concierge subtitle across greetings instead of ulas jatuh tempo', () => {
    const evening = new Date(2026, 10, 25, 20, 0, 0);
    expect(getGreetingForPreset('jp_id', evening)).toEqual({
      line1: 'Selamat malam,',
      line2: 'Concierge',
    });
    expect(getGreetingForPreset('jp_en', evening)).toEqual({
      line1: 'Good evening,',
      line2: 'Concierge',
    });
  });

  it('strips ASCII parenthetical glosses while preserving displayed Japanese phrasing for TTS', () => {
    expect(
      formatJapaneseForTTS('「宿泊税」は宿泊の税金（accommodation tax）です。')
    ).toBe('宿泊税 は宿泊の税金です。');
  });
});

describe('Motion feedbackBus and tokens', () => {
  it('clamps shaderPulse energy strictly inside [0, 0.4] and supports unsubscribing', () => {
    const received: FeedbackSignal[] = [];
    const unsub = subscribeFeedback((sig) => received.push(sig));

    emitFeedback({ intent: 'positive', shaderPulse: { energy: 0.95, origin: [0.5, 0.2] } });
    emitFeedback({ intent: 'negative', shaderPulse: { energy: -0.3 } });
    expect(received).toHaveLength(2);
    expect(received[0].shaderPulse?.energy).toBe(0.4);
    expect(received[1].shaderPulse?.energy).toBe(0);

    unsub();
    emitFeedback({ intent: 'primary', shaderPulse: { energy: 0.25 } });
    expect(received).toHaveLength(2);
  });

  it('keeps semantic shader colors and motion duration tokens well-formed', () => {
    expect(INTENT_SHADER_RGB.negative).toHaveLength(3);
    expect(DURATIONS.instant).toBeLessThan(DURATIONS.micro);
    expect(DURATIONS.micro).toBeLessThan(DURATIONS.standard);
    expect(DURATIONS.standard).toBeLessThan(DURATIONS.macro);
  });
});

describe('Kotoba & Kanji SRS, filtering, quiz, and math ruby checks', () => {
  it('contains >= 135 verified textbook Kotoba items with valid math ruby tags', () => {
    expect(ALL_KOTOBA_CARDS.length).toBeGreaterThanOrEqual(135);
    const problem = generateOccProblem(1, () => 0.25);
    expect(hasMalformedHtmlOutsideRuby(problem.prompt.jaRuby)).toBe(false);
    expect(parseRubyTokens(problem.prompt.jaRuby).some((t) => t.type === 'ruby')).toBe(true);
  });

  it('schedules Kotoba cards cleanly with shared SM-2 engine and updates summary stats', () => {
    const now = 1_700_000_000_000;
    const init = createInitialKotobaState(ALL_KOTOBA_CARDS[0].id, 1, 'front_desk', now);
    const { next: afterGood } = scheduleCard(init, 'good', now);
    const { next: afterGood2 } = scheduleCard(afterGood, 'good', now + 86_400_000);
    const { next: mastered } = scheduleCard(afterGood2, 'easy', now + 86_400_000 * 7);
    expect(mastered.intervalDays).toBeGreaterThanOrEqual(7);

    const map = new Map([[init.cardId, { ...mastered, bookmarked: true }]]);
    const stats = computeKotobaSummary(ALL_KOTOBA_CARDS, map, now + 86_400_000 * 7);
    expect(stats.total).toBe(ALL_KOTOBA_CARDS.length);
    expect(stats.mastered).toBe(1);
    expect(stats.bookmarked).toBe(1);
  });

  it('filters Kotoba cards accurately and prioritizes confusable distractors in Quick Quiz', () => {
    const fdKanji = filterKotobaCards(
      ALL_KOTOBA_CARDS,
      new Map(),
      { category: 'front_desk', chapter: 1, wordType: 'kanji', status: 'all' },
      0,
      'くうしつ'
    );
    expect(fdKanji.some((c) => c.id === 'ktb_fd_001')).toBe(true);

    const targetCard = ALL_KOTOBA_CARDS.find((c) => c.id === 'ktb_fd_001')!;
    const quiz = buildKotobaQuiz([targetCard], ALL_KOTOBA_CARDS, 1, () => 0.1);
    expect(quiz).toHaveLength(1);
    expect(quiz[0].options).toHaveLength(4);
    expect(quiz[0].options.some((o) => o.id === 'ktb_fd_002')).toBe(true);
  });
});
