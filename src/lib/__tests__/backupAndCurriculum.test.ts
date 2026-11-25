import { describe, expect, it } from 'vitest';
import { validateBackupPayload } from '../db';
import { computeOverallMasteryPct, getLast7DaysSummary } from '../analytics';
import { createInitialSRSState } from '../srs';

describe('Backup schema validator', () => {
  it('accepts valid schemaVersion 1 payload and rejects malformed payloads', () => {
    const valid = {
      schemaVersion: 1,
      exportedAt: '2026-11-25T00:00:00.000Z',
      srs_states: [],
      cbt_attempts: [],
      cbt_weak_ids: [],
      drill_progress: [],
      daily_logs: [],
      settings: {
        furiganaMode: 'on',
        langPreset: 'jp_id',
        dailyGoal: 25,
        ttsRate: 1.0,
        ttsAutoPlay: false,
        ecoMode: false,
      },
    };
    expect(validateBackupPayload(valid)).toBe(true);
    expect(validateBackupPayload({ ...valid, schemaVersion: 2 })).toBe(false);
    expect(validateBackupPayload(null)).toBe(false);
    expect(validateBackupPayload({ ...valid, srs_states: 'bad' })).toBe(false);
  });
});

describe('Mastery and weekly summary helpers', () => {
  it('weights mature at 1.0 and learning at 0.4', () => {
    const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as Parameters<
      typeof computeOverallMasteryPct
    >[0];
    const map = new Map([
      ['a', { ...createInitialSRSState('a', 1, 0), intervalDays: 8, repetitions: 2 }],
      ['b', { ...createInitialSRSState('b', 1, 0), intervalDays: 1, repetitions: 1 }],
    ]);
    // (1.0 + 0.4 + 0) / 3 = 46.67% -> 47
    expect(computeOverallMasteryPct(cards, map)).toBe(47);
  });

  it('produces 7 local calendar day buckets ending today', () => {
    const today = new Date(2026, 10, 25, 10, 0, 0);
    const summary = getLast7DaysSummary(
      [
        {
          dateKey: '2026-11-25',
          reviewsCompleted: 12,
          cbtAnswered: 5,
          drillsCompleted: 1,
          studySeconds: 420,
        },
      ],
      today
    );
    expect(summary).toHaveLength(7);
    expect(summary[6]).toMatchObject({
      dateKey: '2026-11-25',
      reviews: 18,
      minutes: 7,
      isToday: true,
    });
  });
});
