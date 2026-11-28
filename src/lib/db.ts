import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  BackupPayload,
  BackupPayloadV2,
  CBTAttemptRecord,
  CBTWeakRecord,
  ChapterId,
  DailyActivityLog,
  DrillId,
  DrillProgressRecord,
  KotobaCategory,
  KotobaSRSState,
  SRSCardState,
  UserSettings,
} from './types';
import { getLocalDateKey } from './analytics';

export const DB_NAME = 'ssw_shukuhaku_db';
export const DB_VERSION = 2;

export const DEFAULT_SETTINGS: UserSettings = {
  furiganaMode: 'on',
  langPreset: 'jp_id',
  hideTranslation: false,
  dailyGoal: 25,
  ttsRate: 1.0,
  ttsAutoPlay: false,
  ecoMode: false,
};

interface SettingsRecord extends UserSettings {
  key: 'user_prefs';
}

interface ShukuhakuDB extends DBSchema {
  srs_states: {
    key: string;
    value: SRSCardState;
    indexes: {
      dueTimestamp: number;
      chapter: ChapterId;
      lapses: number;
    };
  };
  kotoba_states: {
    key: string;
    value: KotobaSRSState;
    indexes: {
      dueTimestamp: number;
      category: KotobaCategory;
      chapter: ChapterId;
      lapses: number;
    };
  };
  cbt_attempts: {
    key: string;
    value: CBTAttemptRecord;
    indexes: {
      timestamp: number;
    };
  };
  cbt_weak_ids: {
    key: string;
    value: CBTWeakRecord;
  };
  drill_progress: {
    key: DrillId;
    value: DrillProgressRecord;
  };
  daily_logs: {
    key: string;
    value: DailyActivityLog;
  };
  settings: {
    key: 'user_prefs';
    value: SettingsRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<ShukuhakuDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ShukuhakuDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser context'));
  }
  if (!dbPromise) {
    dbPromise = openDB<ShukuhakuDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('srs_states')) {
          const store = db.createObjectStore('srs_states', { keyPath: 'cardId' });
          store.createIndex('dueTimestamp', 'dueTimestamp');
          store.createIndex('chapter', 'chapter');
          store.createIndex('lapses', 'lapses');
        }
        if (!db.objectStoreNames.contains('kotoba_states')) {
          const kotobaStore = db.createObjectStore('kotoba_states', { keyPath: 'cardId' });
          kotobaStore.createIndex('dueTimestamp', 'dueTimestamp');
          kotobaStore.createIndex('category', 'category');
          kotobaStore.createIndex('chapter', 'chapter');
          kotobaStore.createIndex('lapses', 'lapses');
        }
        if (!db.objectStoreNames.contains('cbt_attempts')) {
          const store = db.createObjectStore('cbt_attempts', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('cbt_weak_ids')) {
          db.createObjectStore('cbt_weak_ids', { keyPath: 'questionId' });
        }
        if (!db.objectStoreNames.contains('drill_progress')) {
          db.createObjectStore('drill_progress', { keyPath: 'drillId' });
        }
        if (!db.objectStoreNames.contains('daily_logs')) {
          db.createObjectStore('daily_logs', { keyPath: 'dateKey' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getSettings(): Promise<UserSettings> {
  const db = await getDB();
  const row = await db.get('settings', 'user_prefs');
  if (!row) return { ...DEFAULT_SETTINGS };
  const { key: _key, ...prefs } = row;
  return { ...DEFAULT_SETTINGS, ...prefs };
}

export async function saveSettings(next: UserSettings): Promise<UserSettings> {
  const db = await getDB();
  await db.put('settings', { key: 'user_prefs', ...next });
  return next;
}

export async function getAllSRSStates(): Promise<SRSCardState[]> {
  const db = await getDB();
  return db.getAll('srs_states');
}

export async function saveSRSState(state: SRSCardState): Promise<void> {
  const db = await getDB();
  await db.put('srs_states', state);
}

export async function getAllKotobaStates(): Promise<KotobaSRSState[]> {
  const db = await getDB();
  return db.getAll('kotoba_states');
}

export async function saveKotobaState(state: KotobaSRSState): Promise<void> {
  const db = await getDB();
  await db.put('kotoba_states', state);
}

export async function clearWeakSpotCards(): Promise<void> {
  const db = await getDB();
  const [allSrs, allKotoba] = await Promise.all([
    db.getAll('srs_states'),
    db.getAll('kotoba_states'),
  ]);
  const tx = db.transaction(['srs_states', 'kotoba_states', 'cbt_weak_ids'], 'readwrite');
  const srsStore = tx.objectStore('srs_states');
  for (const st of allSrs) {
    const isWeak =
      st.lapses >= 2 || (st.reviewCount >= 3 && st.correctCount / st.reviewCount < 0.6);
    if (isWeak) {
      await srsStore.put({
        ...st,
        lapses: 0,
        correctCount: Math.max(st.correctCount, st.reviewCount),
      });
    }
  }
  const kotobaStore = tx.objectStore('kotoba_states');
  for (const st of allKotoba) {
    const isWeak =
      st.lapses >= 2 || (st.reviewCount >= 3 && st.correctCount / st.reviewCount < 0.6);
    if (isWeak) {
      await kotobaStore.put({
        ...st,
        lapses: 0,
        correctCount: Math.max(st.correctCount, st.reviewCount),
      });
    }
  }
  await tx.objectStore('cbt_weak_ids').clear();
  await tx.done;
}

export async function getAllCBTAttempts(): Promise<CBTAttemptRecord[]> {
  const db = await getDB();
  const list = await db.getAll('cbt_attempts');
  return list.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getAllCBTWeakIds(): Promise<CBTWeakRecord[]> {
  const db = await getDB();
  return db.getAll('cbt_weak_ids');
}

export async function recordCBTAttempt(
  attempt: CBTAttemptRecord,
  questionResults: Array<{ questionId: string; chapter: ChapterId; correct: boolean }>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['cbt_attempts', 'cbt_weak_ids'], 'readwrite');
  await tx.objectStore('cbt_attempts').put(attempt);
  const weakStore = tx.objectStore('cbt_weak_ids');

  for (const res of questionResults) {
    const existing = await weakStore.get(res.questionId);
    if (!res.correct) {
      await weakStore.put({
        questionId: res.questionId,
        chapter: res.chapter,
        wrongCount: (existing?.wrongCount ?? 0) + 1,
        consecutiveCorrect: 0,
        lastMissedAt: attempt.timestamp,
      });
    } else if (existing) {
      const nextConsecutive = (existing.consecutiveCorrect ?? 0) + 1;
      if (nextConsecutive >= 2) {
        await weakStore.delete(res.questionId);
      } else {
        await weakStore.put({
          ...existing,
          consecutiveCorrect: nextConsecutive,
        });
      }
    }
  }
  await tx.done;
}

export async function getAllDrillProgress(): Promise<DrillProgressRecord[]> {
  const db = await getDB();
  return db.getAll('drill_progress');
}

export async function recordDrillCompletion(
  drillId: DrillId,
  accuracyPct: number,
  nowMs = Date.now()
): Promise<DrillProgressRecord> {
  const db = await getDB();
  const prev = await db.get('drill_progress', drillId);
  const next: DrillProgressRecord = {
    drillId,
    bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, Math.round(accuracyPct)),
    completedCount: (prev?.completedCount ?? 0) + 1,
    lastPlayedAt: nowMs,
  };
  await db.put('drill_progress', next);
  return next;
}

export async function getAllDailyLogs(): Promise<DailyActivityLog[]> {
  const db = await getDB();
  return db.getAll('daily_logs');
}

export async function incrementDailyActivity(
  delta: Partial<Omit<DailyActivityLog, 'dateKey'>>,
  date: Date = new Date()
): Promise<DailyActivityLog> {
  const db = await getDB();
  const dateKey = getLocalDateKey(date);
  const prev = (await db.get('daily_logs', dateKey)) ?? {
    dateKey,
    reviewsCompleted: 0,
    cbtAnswered: 0,
    drillsCompleted: 0,
    studySeconds: 0,
  };
  const next: DailyActivityLog = {
    dateKey,
    reviewsCompleted: prev.reviewsCompleted + (delta.reviewsCompleted ?? 0),
    cbtAnswered: prev.cbtAnswered + (delta.cbtAnswered ?? 0),
    drillsCompleted: prev.drillsCompleted + (delta.drillsCompleted ?? 0),
    studySeconds: prev.studySeconds + (delta.studySeconds ?? 0),
  };
  await db.put('daily_logs', next);
  return next;
}

export async function exportBackupPayload(): Promise<BackupPayloadV2> {
  const db = await getDB();
  const [
    srs_states,
    kotoba_states,
    cbt_attempts,
    cbt_weak_ids,
    drill_progress,
    daily_logs,
    settings,
  ] = await Promise.all([
    db.getAll('srs_states'),
    db.getAll('kotoba_states'),
    db.getAll('cbt_attempts'),
    db.getAll('cbt_weak_ids'),
    db.getAll('drill_progress'),
    db.getAll('daily_logs'),
    getSettings(),
  ]);

  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    srs_states,
    kotoba_states,
    cbt_attempts,
    cbt_weak_ids,
    drill_progress,
    daily_logs,
    settings,
  };
}

export function validateBackupPayload(raw: unknown): raw is BackupPayload {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1 && obj.schemaVersion !== 2) return false;
  if (!Array.isArray(obj.srs_states)) return false;
  if (obj.schemaVersion === 2 && !Array.isArray(obj.kotoba_states)) return false;
  if (obj.kotoba_states !== undefined && !Array.isArray(obj.kotoba_states)) return false;
  if (!Array.isArray(obj.cbt_attempts)) return false;
  if (!Array.isArray(obj.cbt_weak_ids)) return false;
  if (!Array.isArray(obj.drill_progress)) return false;
  if (!Array.isArray(obj.daily_logs)) return false;
  if (!obj.settings || typeof obj.settings !== 'object') return false;
  return true;
}

export async function importBackupPayload(raw: unknown): Promise<void> {
  if (!validateBackupPayload(raw)) {
    throw new Error('Invalid backup file: expected schemaVersion 1 or 2 and valid store arrays.');
  }
  const db = await getDB();
  const tx = db.transaction(
    [
      'srs_states',
      'kotoba_states',
      'cbt_attempts',
      'cbt_weak_ids',
      'drill_progress',
      'daily_logs',
      'settings',
    ],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('srs_states').clear(),
    tx.objectStore('kotoba_states').clear(),
    tx.objectStore('cbt_attempts').clear(),
    tx.objectStore('cbt_weak_ids').clear(),
    tx.objectStore('drill_progress').clear(),
    tx.objectStore('daily_logs').clear(),
    tx.objectStore('settings').clear(),
  ]);

  for (const row of raw.srs_states) await tx.objectStore('srs_states').put(row);
  for (const row of raw.kotoba_states ?? []) await tx.objectStore('kotoba_states').put(row);
  for (const row of raw.cbt_attempts) await tx.objectStore('cbt_attempts').put(row);
  for (const row of raw.cbt_weak_ids) await tx.objectStore('cbt_weak_ids').put(row);
  for (const row of raw.drill_progress) await tx.objectStore('drill_progress').put(row);
  for (const row of raw.daily_logs) await tx.objectStore('daily_logs').put(row);

  await tx.objectStore('settings').put({
    key: 'user_prefs',
    ...DEFAULT_SETTINGS,
    ...raw.settings,
  });

  await tx.done;
}

export async function clearAllUserProgress(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [
      'srs_states',
      'kotoba_states',
      'cbt_attempts',
      'cbt_weak_ids',
      'drill_progress',
      'daily_logs',
      'settings',
    ],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('srs_states').clear(),
    tx.objectStore('kotoba_states').clear(),
    tx.objectStore('cbt_attempts').clear(),
    tx.objectStore('cbt_weak_ids').clear(),
    tx.objectStore('drill_progress').clear(),
    tx.objectStore('daily_logs').clear(),
    tx.objectStore('settings').clear(),
  ]);
  await tx.done;
}
