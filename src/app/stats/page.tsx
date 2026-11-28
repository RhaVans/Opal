'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  CheckCircle2,
  Download,
  Gauge,
  Leaf,
  RotateCcw,
  Trash2,
  Upload,
  Volume2,
  Target,
  Type,
  Globe,
  EyeOff,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { ALL_CBT_QUESTIONS, ALL_FLASHCARDS } from '@/lib/curriculum';
import { CHAPTER_META } from '@/lib/chapters';
import {
  computeChapterStats,
  getLast7DaysSummary,
  getLocalDateKey,
  isCardWeakSpot,
} from '@/lib/analytics';
import type { FuriganaMode, LangPreset } from '@/lib/types';
import { StatCard } from '@/components/ui/StatCard';
import { PillBarChart } from '@/components/ui/PillBarChart';
import { RingBadge } from '@/components/ui/RingBadge';
import { ListRow } from '@/components/ui/ListRow';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Chip } from '@/components/ui/Chip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sparkle } from '@/components/ui/Sparkle';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { SemanticIcon } from '@/components/motion/SemanticIcon';

export default function StatsPage() {
  const {
    hydrated,
    settings,
    srsMap,
    cbtWeakList,
    dailyLogs,
    updateSettings,
    clearWeakSpots,
    exportBackup,
    importBackup,
    resetProgress,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetDialogRef = useRef<HTMLDialogElement>(null);
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const todayKey = getLocalDateKey();
  const weekSummary = useMemo(
    () => getLast7DaysSummary(dailyLogs, new Date()),
    [dailyLogs, todayKey]
  );
  const nowMs = Date.now();
  const totalWeekReviews = weekSummary.reduce((acc, d) => acc + d.reviews, 0);
  const totalWeekMinutes = weekSummary.reduce((acc, d) => acc + d.minutes, 0);

  const weakCards = useMemo(
    () => ALL_FLASHCARDS.filter((c) => isCardWeakSpot(srsMap.get(c.id))),
    [srsMap]
  );

  const weakQuestions = useMemo(() => {
    const qMap = new Map(ALL_CBT_QUESTIONS.map((q) => [q.id, q]));
    return cbtWeakList
      .map((w) => ({ weak: w, item: qMap.get(w.questionId) }))
      .filter((x) => Boolean(x.item));
  }, [cbtWeakList]);

  useEffect(() => {
    const dialog = resetDialogRef.current;
    if (!dialog) return;
    if (resetOpen && !dialog.open) dialog.showModal();
    else if (!resetOpen && dialog.open) dialog.close();
  }, [resetOpen]);

  useEffect(() => {
    const dialog = resetDialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      dialog.returnValue = '';
      setResetOpen(false);
    };
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  const handleExport = async () => {
    try {
      const payload = await exportBackup();
      const jsonText = JSON.stringify(payload, null, 2);
      const filename = `ssw-recall-backup-${getLocalDateKey()}.json`;
      const androidBackup = (
        window as unknown as { AndroidBackup?: { saveBackup?: (name: string, data: string) => void } }
      ).AndroidBackup;

      if (androidBackup?.saveBackup) {
        androidBackup.saveBackup(filename, jsonText);
      } else {
        const blob = new Blob([jsonText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      setStatusMessage({
        kind: 'ok',
        text: `Exported backup (${payload.srs_states.length} card states, ${payload.cbt_attempts.length} CBT attempts).`,
      });
    } catch (err) {
      setStatusMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Export failed.',
      });
    }
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      await importBackup(parsed);
      setStatusMessage({
        kind: 'ok',
        text: 'Backup imported and IndexedDB state restored.',
      });
    } catch (err) {
      setStatusMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Invalid backup JSON file.',
      });
    }
  };

  const handleConfirmReset = async () => {
    await resetProgress();
    setResetOpen(false);
    setStatusMessage({
      kind: 'ok',
      text: 'All local progress and settings have been reset.',
    });
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="display-headline text-[#1D1D1F]">Progress</h1>
      </header>

      {!hydrated ? (
        <div
          aria-busy="true"
          className="rounded-[var(--radius-hero)] bg-white p-6 shadow-[var(--shadow-soft)] text-sm text-[#5B5B62]"
        >
          Loading statistics...
        </div>
      ) : (
        <>
          {/* Weekly Activity Card */}
          <section
            aria-label="Weekly study activity"
            className="rounded-[var(--radius-hero)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow text-[#4D3EA3]">Last 7 Days</span>
              <span className="text-xs font-semibold text-[#5B5B62]">Weekly total</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard
                eyebrow="Reviews"
                value={<AnimatedNumber value={totalWeekReviews} />}
                sublabel="items"
                variant="tone"
                toneBg="#F5F5F7"
              />
              <StatCard
                eyebrow="Minutes"
                value={<AnimatedNumber value={totalWeekMinutes} />}
                sublabel="studied"
                variant="tone"
                toneBg="#F5F5F7"
              />
            </div>

            <PillBarChart
              ariaLabel="7-day activity bar chart showing daily reviews"
              data={weekSummary.map((d) => ({
                key: d.dateKey,
                label: d.dayShort,
                value: d.reviews,
                highlight: d.isToday,
              }))}
            />
          </section>

          {/* 5-Chapter MasteryRings */}
          <section aria-label="Chapter mastery" className="space-y-3">
            <h2 className="text-lg font-bold text-[#1D1D1F]">Chapter Mastery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CHAPTER_META.map((ch) => {
                const stats = computeChapterStats(ch.id, ALL_FLASHCARDS, srsMap, nowMs);
                return (
                  <div
                    key={ch.id}
                    style={{ backgroundColor: ch.toneBg, color: ch.toneBody }}
                    className={[
                      'rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)] flex items-center justify-between gap-2',
                      ch.id === 5 ? 'col-span-2 md:col-span-1' : '',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <span className="eyebrow block" style={{ color: ch.toneBody }}>
                        {ch.code}
                      </span>
                      <p
                        className="text-xs font-bold leading-snug mt-0.5"
                        style={{ color: ch.toneText }}
                      >
                        {ch.enTitle}
                      </p>
                      <p className="text-[11px] font-semibold tabular-nums mt-0.5">
                        {stats.pct}% mastery
                      </p>
                    </div>
                    <RingBadge
                      size={40}
                      value={stats.masteredDisplay}
                      max={stats.total}
                      onDark={ch.isDarkSurface}
                      trackColor={
                        ch.isDarkSurface ? 'rgba(255,255,255,0.22)' : 'rgba(29,29,31,0.14)'
                      }
                      strokeColor={ch.isDarkSurface ? '#FFFFFF' : '#1D1D1F'}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Weak Spot List */}
          <section aria-label="Weak spots" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-[#1D1D1F]">
                Weak Spots ({weakCards.length + weakQuestions.length})
              </h2>
              {weakCards.length + weakQuestions.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void clearWeakSpots()}
                  className="min-h-[48px] px-3 text-xs font-bold text-[#CC2F52] hover:underline"
                >
                  Clear Weak Spots
                </button>
              ) : null}
            </div>

            {weakCards.length + weakQuestions.length === 0 ? (
              <div className="rounded-[var(--radius-card)] bg-white p-6 text-center shadow-[var(--shadow-soft)] space-y-2">
                <div className="w-10 h-10 mx-auto rounded-[var(--radius-icon)] bg-[#E1DAFB] flex items-center justify-center">
                  <Sparkle size={18} color="#4D3EA3" />
                </div>
                <p className="text-sm font-bold text-[#1D1D1F]">No weak spots flagged</p>
                <p className="text-xs text-[#5B5B62]">
                  Cards lapsed twice or missed CBT questions appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {weakCards.slice(0, 8).map((card) => {
                  const st = srsMap.get(card.id);
                  const meta =
                    settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en'
                      ? card.prompt.id
                      : card.prompt.en;
                  return (
                    <ListRow
                      key={card.id}
                      eyebrow={`FLASHCARD · CH 0${card.chapter} · p.${card.pdfPage}`}
                      eyebrowColor="#CC2F52"
                      title={card.prompt.jaPlain}
                      meta={meta}
                      rightValue={`${st?.lapses ?? 0} lapses`}
                    />
                  );
                })}
                {weakQuestions.slice(0, 8).map(({ weak, item }) =>
                  item ? (
                    <ListRow
                      key={weak.questionId}
                      eyebrow={`CBT · CH 0${item.chapter} · p.${item.pdfPage}`}
                      eyebrowColor="#4D3EA3"
                      title={item.question.jaPlain}
                      meta={
                        settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en'
                          ? item.question.id
                          : item.question.en
                      }
                      rightValue={`${weak.wrongCount} missed`}
                    />
                  ) : null
                )}
              </div>
            )}
          </section>

          {/* Settings Panel */}
          <section aria-label="Study settings and backup" className="space-y-3">
            <h2 className="text-lg font-bold text-[#1D1D1F]">Settings & Backup</h2>

            <div className="space-y-2.5">
              <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-soft)] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-[#E1DAFB] text-[#4D3EA3] flex items-center justify-center shrink-0">
                    <Target size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">Daily Review Goal</p>
                    <p className="text-xs text-[#5B5B62]">Target flashcards per day</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[15, 25, 40, 60].map((goal) => (
                    <Chip
                      key={goal}
                      selected={settings.dailyGoal === goal}
                      onClick={() => void updateSettings({ dailyGoal: goal })}
                    >
                      {goal} cards
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-soft)] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-[#E1DAFB] text-[#4D3EA3] flex items-center justify-center shrink-0">
                    <Type size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">Default Furigana</p>
                    <p className="text-xs text-[#5B5B62]">On, tap-to-peek, or hidden</p>
                  </div>
                </div>
                <SegmentedControl<FuriganaMode>
                  ariaLabel="Default furigana mode"
                  value={settings.furiganaMode}
                  onChange={(furiganaMode) => void updateSettings({ furiganaMode })}
                  options={[
                    { value: 'on', label: 'On' },
                    { value: 'peek', label: 'Peek' },
                    { value: 'off', label: 'Off' },
                  ]}
                />
              </div>

              <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-soft)] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-[#E1DAFB] text-[#4D3EA3] flex items-center justify-center shrink-0">
                    <Globe size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">Language Preset</p>
                    <p className="text-xs text-[#5B5B62]">Translations shown with Japanese</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'jp_id', label: 'JP + ID' },
                      { id: 'jp_en', label: 'JP + EN' },
                      { id: 'jp_id_en', label: 'JP + ID + EN' },
                      { id: 'jp_only', label: 'JP Only' },
                    ] as Array<{ id: LangPreset; label: string }>
                  ).map((item) => (
                    <Chip
                      key={item.id}
                      pillGroupId="stats-lang"
                      selected={settings.langPreset === item.id}
                      onClick={() => void updateSettings({ langPreset: item.id })}
                    >
                      {item.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-soft)] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-icon)] bg-[#E1DAFB] text-[#4D3EA3] flex items-center justify-center shrink-0">
                    <Gauge size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">Japanese TTS Speed</p>
                    <p className="text-xs text-[#5B5B62]">Web Speech playback rate</p>
                  </div>
                </div>
                <SegmentedControl<'0.75' | '1' | '1.2'>
                  ariaLabel="TTS speech rate"
                  value={String(settings.ttsRate) as '0.75' | '1' | '1.2'}
                  onChange={(val) =>
                    void updateSettings({ ttsRate: Number(val) as 0.75 | 1.0 | 1.2 })
                  }
                  options={[
                    { value: '0.75', label: '0.75x' },
                    { value: '1', label: '1.0x' },
                    { value: '1.2', label: '1.2x' },
                  ]}
                />
              </div>

              <SettingsRow
                icon={<EyeOff size={18} aria-hidden="true" />}
                label="Hide Translations"
                description="Show Japanese only during active questions"
                control={
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.hideTranslation}
                    aria-label="Toggle Hide Translations"
                    onClick={() => void updateSettings({ hideTranslation: !settings.hideTranslation })}
                    className={[
                      'w-14 h-12 min-w-[56px] min-h-[48px] rounded-[var(--radius-chip)] p-1.5 flex items-center transition-colors',
                      settings.hideTranslation ? 'bg-[#4D3EA3] justify-end' : 'bg-black/15 justify-start',
                    ].join(' ')}
                  >
                    <span className="w-6 h-6 rounded-full bg-white shadow" />
                  </button>
                }
              />

              <SettingsRow
                icon={<Volume2 size={18} aria-hidden="true" />}
                label="TTS Autoplay"
                description="Speak new card automatically"
                control={
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.ttsAutoPlay}
                    aria-label="Toggle TTS Autoplay"
                    onClick={() => void updateSettings({ ttsAutoPlay: !settings.ttsAutoPlay })}
                    className={[
                      'w-14 h-12 min-w-[56px] min-h-[48px] rounded-[var(--radius-chip)] p-1.5 flex items-center transition-colors',
                      settings.ttsAutoPlay ? 'bg-[#4D3EA3] justify-end' : 'bg-black/15 justify-start',
                    ].join(' ')}
                  >
                    <span className="w-6 h-6 rounded-full bg-white shadow" />
                  </button>
                }
              />

              <SettingsRow
                icon={<Leaf size={18} aria-hidden="true" />}
                label="Eco Mode"
                description="Use static CSS gradient instead of WebGL shader"
                control={
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.ecoMode}
                    aria-label="Toggle Eco Mode"
                    onClick={() => void updateSettings({ ecoMode: !settings.ecoMode })}
                    className={[
                      'w-14 h-12 min-w-[56px] min-h-[48px] rounded-[var(--radius-chip)] p-1.5 flex items-center transition-colors',
                      settings.ecoMode ? 'bg-[#4D3EA3] justify-end' : 'bg-black/15 justify-start',
                    ].join(' ')}
                  >
                    <span className="w-6 h-6 rounded-full bg-white shadow" />
                  </button>
                }
              />
            </div>

            {statusMessage ? (
              <div
                role="status"
                className={[
                  'reveal-panel rounded-[var(--radius-card)] p-3.5 text-xs font-semibold flex items-center gap-2',
                  statusMessage.kind === 'ok'
                    ? 'bg-[#1FA87A]/20 text-[#1D1D1F]'
                    : 'bg-[#CC2F52] text-white',
                ].join(' ')}
              >
                {statusMessage.kind === 'ok' ? (
                  <SemanticIcon behavior="draw-check" trigger={statusMessage.text}>
                    <CheckCircle2 size={16} aria-hidden="true" />
                  </SemanticIcon>
                ) : null}
                <span>{statusMessage.text}</span>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => void handleExport()}
                className="min-h-[48px] px-4 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-bold inline-flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Download size={16} aria-hidden="true" />
                Export JSON
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[48px] px-4 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] border border-black/15 text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[var(--shadow-soft)] active:scale-95 transition-transform"
              >
                <Upload size={16} aria-hidden="true" />
                Import JSON
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                aria-label="Import backup JSON file"
                onChange={(e) => void handleImportFile(e)}
                className="sr-only"
              />
            </div>

            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="w-full min-h-[48px] px-4 rounded-[var(--radius-chip)] bg-[#FFD2F4] text-[#450C3F] text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <Trash2 size={16} aria-hidden="true" />
              Reset All Local Progress
            </button>
          </section>
        </>
      )}

      {/* Native confirmation dialog before irreversible IndexedDB reset */}
      <dialog ref={resetDialogRef} closedby="any" aria-labelledby="reset-dialog-title">
        <div className="p-6 space-y-4">
          <h2 id="reset-dialog-title" className="text-xl font-bold text-[#1D1D1F]">
            Reset all local progress?
          </h2>
          <p className="text-sm text-[#5B5B62]">
            This clears all SRS schedules, CBT attempts, drill records, and settings from IndexedDB. Export a JSON backup first if you want to keep your progress.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              autoFocus
              onClick={() => resetDialogRef.current?.close()}
              className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#F5F5F7] text-[#1D1D1F] text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmReset()}
              className="min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-[#CC2F52] text-white text-sm font-bold inline-flex items-center gap-1.5"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Confirm Reset
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
