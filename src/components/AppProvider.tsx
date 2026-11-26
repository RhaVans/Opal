'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  BackupPayload,
  CBTAttemptRecord,
  CBTWeakRecord,
  ChapterId,
  DailyActivityLog,
  DrillId,
  DrillProgressRecord,
  SRSCardState,
  SRSRating,
  UserSettings,
} from '@/lib/types';
import {
  clearAllUserProgress,
  clearWeakSpotCards,
  DEFAULT_SETTINGS,
  exportBackupPayload,
  getAllCBTAttempts,
  getAllCBTWeakIds,
  getAllDailyLogs,
  getAllDrillProgress,
  getAllSRSStates,
  getSettings,
  importBackupPayload,
  incrementDailyActivity,
  recordCBTAttempt,
  recordDrillCompletion,
  saveSettings,
  saveSRSState,
} from '@/lib/db';
import { createInitialSRSState, scheduleCard } from '@/lib/srs';
import { getTTSAvailability, type TTSAvailability } from '@/lib/tts';

interface AppContextValue {
  hydrated: boolean;
  dbError: string | null;
  settings: UserSettings;
  adaptiveEco: boolean;
  triggerAdaptiveEco: () => void;
  srsMap: Map<string, SRSCardState>;
  cbtAttempts: CBTAttemptRecord[];
  cbtWeakList: CBTWeakRecord[];
  drillProgress: DrillProgressRecord[];
  dailyLogs: DailyActivityLog[];
  ttsAvailability: TTSAvailability;
  ttsTipDismissed: boolean;
  dismissTtsTip: () => void;
  hideDockOverride: boolean;
  setHideDockOverride: (hide: boolean) => void;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  reviewCard: (
    cardId: string,
    chapter: ChapterId,
    rating: SRSRating,
    elapsedSec?: number
  ) => Promise<{ next: SRSCardState; nextLabel: string }>;
  toggleBookmark: (cardId: string, chapter: ChapterId) => Promise<void>;
  saveCBTResult: (
    attempt: CBTAttemptRecord,
    questionResults: Array<{ questionId: string; chapter: ChapterId; correct: boolean }>
  ) => Promise<void>;
  saveDrillResult: (drillId: DrillId, accuracyPct: number, durationSec: number) => Promise<void>;
  clearWeakSpots: () => Promise<void>;
  exportBackup: () => Promise<BackupPayload>;
  importBackup: (raw: unknown) => Promise<void>;
  resetProgress: () => Promise<void>;
  reloadFromDB: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [adaptiveEco, setAdaptiveEco] = useState(false);
  const [srsMap, setSrsMap] = useState<Map<string, SRSCardState>>(() => new Map());
  const [cbtAttempts, setCbtAttempts] = useState<CBTAttemptRecord[]>([]);
  const [cbtWeakList, setCbtWeakList] = useState<CBTWeakRecord[]>([]);
  const [drillProgress, setDrillProgress] = useState<DrillProgressRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyActivityLog[]>([]);
  const [hideDockOverride, setHideDockOverride] = useState(false);
  const [ttsTipDismissed, setTtsTipDismissed] = useState(false);
  const [ttsAvailability, setTtsAvailability] = useState<TTSAvailability>({
    supported: true,
    hasJapaneseVoice: true,
    voiceName: null,
    isLocalVoice: false,
  });

  const reloadFromDB = useCallback(async () => {
    try {
      const [prefs, srsList, attempts, weakIds, drills, logs] = await Promise.all([
        getSettings(),
        getAllSRSStates(),
        getAllCBTAttempts(),
        getAllCBTWeakIds(),
        getAllDrillProgress(),
        getAllDailyLogs(),
      ]);
      setSettings(prefs);
      setSrsMap(new Map(srsList.map((s) => [s.cardId, s])));
      setCbtAttempts(attempts);
      setCbtWeakList(weakIds);
      setDrillProgress(drills);
      setDailyLogs(logs);
      setDbError(null);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Unable to access local IndexedDB storage.');
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void reloadFromDB();
  }, [reloadFromDB]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.location.search.includes('eco=1')) {
      setAdaptiveEco(true);
    }

    const refreshVoices = () => {
      setTtsAvailability(getTTSAvailability());
    };
    refreshVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    }

    const isAndroidApk = Boolean(
      window.AndroidTTS || (window as unknown as { AndroidBackup?: unknown }).AndroidBackup
    );
    if ('serviceWorker' in navigator && !isAndroidApk) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Ignore registration errors in unsupported dev contexts
      });
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
      }
    };
  }, []);

  const triggerAdaptiveEco = useCallback(() => {
    setAdaptiveEco(true);
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      const merged = { ...settings, ...patch };
      setSettings(merged);
      await saveSettings(merged);
    },
    [settings]
  );

  const reviewCard = useCallback(
    async (cardId: string, chapter: ChapterId, rating: SRSRating, elapsedSec = 8) => {
      const nowMs = Date.now();
      const prev = srsMap.get(cardId) ?? createInitialSRSState(cardId, chapter, nowMs);
      const res = scheduleCard(prev, rating, nowMs);
      await saveSRSState(res.next);
      const updatedLog = await incrementDailyActivity({
        reviewsCompleted: 1,
        studySeconds: Math.max(1, Math.round(elapsedSec)),
      });

      setSrsMap((old) => {
        const copy = new Map(old);
        copy.set(cardId, res.next);
        return copy;
      });
      setDailyLogs((old) => {
        const filtered = old.filter((l) => l.dateKey !== updatedLog.dateKey);
        return [...filtered, updatedLog];
      });
      return res;
    },
    [srsMap]
  );

  const toggleBookmark = useCallback(
    async (cardId: string, chapter: ChapterId) => {
      const prev = srsMap.get(cardId) ?? createInitialSRSState(cardId, chapter, Date.now());
      const next: SRSCardState = { ...prev, bookmarked: !prev.bookmarked };
      await saveSRSState(next);
      setSrsMap((old) => {
        const copy = new Map(old);
        copy.set(cardId, next);
        return copy;
      });
    },
    [srsMap]
  );

  const saveCBTResult = useCallback(
    async (
      attempt: CBTAttemptRecord,
      questionResults: Array<{ questionId: string; chapter: ChapterId; correct: boolean }>
    ) => {
      await recordCBTAttempt(attempt, questionResults);
      await incrementDailyActivity({
        cbtAnswered: attempt.totalQuestions,
        studySeconds: Math.max(1, attempt.durationSec),
      });
      await reloadFromDB();
    },
    [reloadFromDB]
  );

  const saveDrillResult = useCallback(
    async (drillId: DrillId, accuracyPct: number, durationSec: number) => {
      await recordDrillCompletion(drillId, accuracyPct);
      await incrementDailyActivity({
        drillsCompleted: 1,
        studySeconds: Math.max(1, Math.round(durationSec)),
      });
      await reloadFromDB();
    },
    [reloadFromDB]
  );

  const clearWeakSpots = useCallback(async () => {
    await clearWeakSpotCards();
    await reloadFromDB();
  }, [reloadFromDB]);

  const exportBackup = useCallback(() => exportBackupPayload(), []);

  const importBackup = useCallback(
    async (raw: unknown) => {
      await importBackupPayload(raw);
      await reloadFromDB();
    },
    [reloadFromDB]
  );

  const resetProgress = useCallback(async () => {
    await clearAllUserProgress();
    await reloadFromDB();
  }, [reloadFromDB]);

  const dismissTtsTip = useCallback(() => setTtsTipDismissed(true), []);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      dbError,
      settings,
      adaptiveEco,
      triggerAdaptiveEco,
      srsMap,
      cbtAttempts,
      cbtWeakList,
      drillProgress,
      dailyLogs,
      ttsAvailability,
      ttsTipDismissed,
      dismissTtsTip,
      hideDockOverride,
      setHideDockOverride,
      updateSettings,
      reviewCard,
      toggleBookmark,
      saveCBTResult,
      saveDrillResult,
      clearWeakSpots,
      exportBackup,
      importBackup,
      resetProgress,
      reloadFromDB,
    }),
    [
      hydrated,
      dbError,
      settings,
      adaptiveEco,
      triggerAdaptiveEco,
      srsMap,
      cbtAttempts,
      cbtWeakList,
      drillProgress,
      dailyLogs,
      ttsAvailability,
      ttsTipDismissed,
      dismissTtsTip,
      hideDockOverride,
      updateSettings,
      reviewCard,
      toggleBookmark,
      saveCBTResult,
      saveDrillResult,
      clearWeakSpots,
      exportBackup,
      importBackup,
      resetProgress,
      reloadFromDB,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}
