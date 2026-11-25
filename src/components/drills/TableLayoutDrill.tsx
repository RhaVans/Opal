'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { DRILLS_DATA } from '@/lib/curriculum';
import { useApp } from '@/components/AppProvider';
import { TrilingualBlock } from '@/components/text/TrilingualBlock';
import { Chip } from '@/components/ui/Chip';
import { Sparkle } from '@/components/ui/Sparkle';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { useViewTransition } from '@/components/motion/ViewTransitionProvider';
import { emitFeedback } from '@/lib/motion/feedbackBus';

interface TableLayoutDrillProps {
  onExit: () => void;
}

type RoundMode = 'washoku' | 'western' | 'etiquette';

export function TableLayoutDrill({ onExit }: TableLayoutDrillProps) {
  const { settings, saveDrillResult } = useApp();
  const { runDomTransition } = useViewTransition();
  const [round, setRound] = useState<RoundMode>('washoku');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [spatialError, setSpatialError] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [etiquetteIdx, setEtiquetteIdx] = useState(0);
  const [etiquettePicked, setEtiquettePicked] = useState<string | null>(null);
  const [etiquetteCorrectCount, setEtiquetteCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  const zones = round === 'washoku' ? DRILLS_DATA.washokuZones : DRILLS_DATA.westernZones;
  const items = round === 'washoku' ? DRILLS_DATA.washokuItems : DRILLS_DATA.westernItems;
  const etiquetteList = DRILLS_DATA.etiquetteRules;

  const placedItemIds = new Set(Object.values(placements));
  const roundComplete = items.every((it) => placedItemIds.has(it.id));

  const switchRound = (nextRound: RoundMode) => {
    runDomTransition(
      () => {
        setRound(nextRound);
        setSelectedItemId(null);
        setPlacements({});
        setSpatialError(null);
      },
      {
        type: 'state-morph',
        sourceId: 'drill-table',
        targetId: 'drill-table',
        focusSelector: null,
      }
    );
  };

  const handleZoneTap = (zoneId: string) => {
    if (!selectedItemId) {
      setSpatialError('First select a dish or cutlery item below, then tap a numbered zone.');
      return;
    }
    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;

    if (item.zoneId === zoneId) {
      setPlacements((prev) => ({ ...prev, [zoneId]: item.id }));
      setSelectedItemId(null);
      setSpatialError(null);
      emitFeedback({ intent: 'positive', shaderPulse: { energy: 0.22, origin: [0.5, 0.45] } });
    } else {
      setMistakes((m) => m + 1);
      setSpatialError(`Incorrect position for ${item.label.en}. Try another zone.`);
      emitFeedback({ intent: 'negative', shaderPulse: { energy: 0.22, origin: [0.5, 0.5] } });
    }
  };

  const handleEtiquetteAnswer = (key: string) => {
    if (etiquettePicked !== null) return;
    setEtiquettePicked(key);
    const current = etiquetteList[etiquetteIdx];
    const ok = current && key === current.correctKey;
    emitFeedback({
      intent: ok ? 'positive' : 'negative',
      shaderPulse: { energy: ok ? 0.24 : 0.22, origin: [0.5, 0.5] },
    });
    if (ok) {
      setEtiquetteCorrectCount((c) => c + 1);
    } else {
      setMistakes((m) => m + 1);
    }
  };

  const handleNextEtiquette = () => {
    if (etiquetteIdx + 1 < etiquetteList.length) {
      setEtiquetteIdx((i) => i + 1);
      setEtiquettePicked(null);
    } else {
      setFinished(true);
      const totalSteps = 4 + 4 + etiquetteList.length;
      const accuracy = Math.max(25, Math.round((totalSteps / (totalSteps + mistakes)) * 100));
      const durationSec = Math.max(5, Math.round((Date.now() - startedAtRef.current) / 1000));
      void saveDrillResult('table', accuracy, durationSec);
    }
  };

  const resetAll = () => {
    setRound('washoku');
    setSelectedItemId(null);
    setPlacements({});
    setSpatialError(null);
    setMistakes(0);
    setEtiquetteIdx(0);
    setEtiquettePicked(null);
    setEtiquetteCorrectCount(0);
    setFinished(false);
    startedAtRef.current = Date.now();
  };

  const progressPct =
    round === 'washoku'
      ? Math.round((placedItemIds.size / 4) * 33)
      : round === 'western'
        ? 33 + Math.round((placedItemIds.size / 4) * 33)
        : 66 + Math.round(((etiquetteIdx + (etiquettePicked ? 1 : 0)) / etiquetteList.length) * 34);

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          aria-label="Back to drills"
          className="inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] shadow-[var(--shadow-soft)]"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-semibold text-[#5B5B62] mb-1 tabular-nums">
            <span>Table & Etiquette</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className="w-full h-full rounded-full bg-[#4D3EA3] origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${progressPct / 100})` }}
            />
          </div>
        </div>
      </div>

      <div role="group" aria-label="Choose table drill round" className="flex gap-2 overflow-x-auto no-scrollbar">
        <Chip pillGroupId="table-round" selected={round === 'washoku'} onClick={() => switchRound('washoku')}>
          1. Washoku Tray
        </Chip>
        <Chip pillGroupId="table-round" selected={round === 'western'} onClick={() => switchRound('western')}>
          2. Western Setting
        </Chip>
        <Chip pillGroupId="table-round" selected={round === 'etiquette'} onClick={() => switchRound('etiquette')}>
          3. Etiquette
        </Chip>
      </div>

      {finished ? (
        <section className="rounded-[var(--radius-hero)] bg-[#1D1D1F] text-white p-6 space-y-4">
          <div className="w-12 h-12 rounded-[var(--radius-icon)] bg-[#4D3EA3] flex items-center justify-center">
            <Sparkle size={22} color="#FFFFFF" />
          </div>
          <h2 className="text-2xl font-bold">Table & Etiquette Complete</h2>
          <p className="text-sm text-[#B4B4B8] tabular-nums">
            Etiquette score: {etiquetteCorrectCount}/{etiquetteList.length} · Total mistakes:{' '}
            {mistakes}
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-2 min-h-[48px] px-5 rounded-[var(--radius-chip)] bg-white text-[#1D1D1F] text-sm font-bold"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Play Again
          </button>
        </section>
      ) : round === 'etiquette' ? (
        (() => {
          const current = etiquetteList[etiquetteIdx];
          if (!current) return null;
          return (
            <section
              data-vt-id="drill-table"
              className="rounded-[var(--radius-hero)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="eyebrow text-[#4D3EA3]">
                  Question {etiquetteIdx + 1}/{etiquetteList.length} · p.{current.pdfPage}
                </span>
              </div>
              <TrilingualBlock
                text={current.question}
                furiganaMode={settings.furiganaMode}
                langPreset={settings.langPreset}
                jaClassName="text-lg font-bold leading-[1.75]"
              />
              <div className="space-y-2.5">
                {current.options.map((opt) => {
                  const picked = etiquettePicked === opt.key;
                  const isCorrect = opt.key === current.correctKey;
                  let style = 'bg-[#F5F5F7] text-[#1D1D1F] border-black/10 hover:bg-[#E1DAFB]/40';
                  if (etiquettePicked) {
                    if (isCorrect) style = 'bg-[#1FA87A] text-[#1D1D1F] border-[#1FA87A]';
                    else if (picked) style = 'bg-[#CC2F52] text-white border-[#CC2F52]';
                  }
                  return (
                    <InteractiveSurface
                      key={opt.key}
                      type="button"
                      disabled={etiquettePicked !== null}
                      intent={picked ? (isCorrect ? 'positive' : 'negative') : isCorrect && etiquettePicked ? 'positive' : 'neutral'}
                      pressScale={0.97}
                      feedbackKey={etiquettePicked ? `${etiquetteIdx}:${opt.key}:${etiquettePicked}` : null}
                      onClick={() => handleEtiquetteAnswer(opt.key)}
                      className={`w-full min-h-[56px] p-3.5 rounded-[var(--radius-card)] border text-left ${style}`}
                    >
                      <TrilingualBlock
                        text={opt.text}
                        furiganaMode={settings.furiganaMode}
                        langPreset={settings.langPreset}
                        darkSurface={Boolean(etiquettePicked && picked && !isCorrect)}
                        jaClassName="text-sm font-bold leading-[1.6]"
                        secondaryClassName="text-xs"
                      />
                    </InteractiveSurface>
                  );
                })}
              </div>

              {etiquettePicked ? (
                <div className="reveal-panel rounded-[var(--radius-card)] bg-[#E1DAFB]/55 p-4 space-y-3">
                  <TrilingualBlock
                    text={current.explanation}
                    furiganaMode={settings.furiganaMode}
                    langPreset={settings.langPreset}
                    jaClassName="text-sm font-bold leading-[1.7]"
                    secondaryClassName="text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleNextEtiquette}
                    className="w-full min-h-[48px] rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-sm font-bold"
                  >
                    {etiquetteIdx + 1 < etiquetteList.length ? 'Next Question' : 'Finish Drill'}
                  </button>
                </div>
              ) : null}
            </section>
          );
        })()
      ) : (
        <section
          data-vt-id="drill-table"
          className="rounded-[var(--radius-hero)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="eyebrow text-[#4D3EA3]">
                {round === 'washoku' ? 'Round 1 · p.58' : 'Round 2 · p.61'}
              </span>
              <h2 className="text-lg font-bold text-[#1D1D1F]">
                {round === 'washoku' ? 'Washoku Ichiju-Sansai (一汁三菜)' : 'Western Table Setting'}
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#5B5B62] tabular-nums">
              {placedItemIds.size}/4 placed
            </span>
          </div>

          <p className="text-xs text-[#5B5B62]">
            Tap an item chip below, then tap its matching numbered zone on the tray.
          </p>

          {/* Interactive Spatial SVG + Tap Buttons */}
          <div className="relative w-full max-w-[360px] mx-auto aspect-[320/220] rounded-[20px] bg-[#F5F5F7] border border-black/10 overflow-hidden">
            <svg
              viewBox="0 0 320 220"
              className="w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              <rect x="8" y="8" width="304" height="204" rx="18" fill="#FFFFFF" stroke="#1D1D1F" strokeOpacity="0.14" strokeWidth="2" />
              {round === 'western' ? (
                <circle cx="160" cy="132" r="46" fill="#E1DAFB" fillOpacity="0.5" stroke="#4D3EA3" strokeWidth="2" />
              ) : (
                <line x1="20" y1="200" x2="300" y2="200" stroke="#1D1D1F" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" />
              )}
            </svg>

            {zones.map((z) => {
              const placedId = placements[z.id];
              const placedItem = items.find((i) => i.id === placedId);
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => handleZoneTap(z.id)}
                  aria-label={`Zone ${z.number}: ${z.positionLabel.en}${placedItem ? `, placed ${placedItem.label.en}` : ''}`}
                  style={{
                    left: `${(z.x / 320) * 100}%`,
                    top: `${(z.y / 220) * 100}%`,
                    width: `${(z.w / 320) * 100}%`,
                    height: `${(z.h / 220) * 100}%`,
                  }}
                  className={[
                    'absolute rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 text-center transition min-w-[48px] min-h-[48px]',
                    placedItem
                      ? 'bg-[#1FA87A]/20 border-[#1FA87A] text-[#1D1D1F]'
                      : selectedItemId
                        ? 'bg-[#E1DAFB]/55 border-[#4D3EA3] border-dashed text-[#4D3EA3]'
                        : 'bg-white/80 border-black/20 border-dashed text-[#5B5B62]',
                  ].join(' ')}
                >
                  <span className="text-[11px] font-bold">
                    {placedItem ? placedItem.label.jaPlain : `#${z.number}`}
                  </span>
                  <span className="text-[10px] font-semibold leading-tight">
                    {placedItem ? placedItem.label.en : z.positionLabel.en}
                  </span>
                </button>
              );
            })}
          </div>

          {spatialError ? (
            <div
              role="status"
              className="reveal-panel rounded-[var(--radius-card)] bg-[#CC2F52] text-white px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2"
            >
              <XCircle size={16} aria-hidden="true" />
              {spatialError}
            </div>
          ) : null}

          {!roundComplete ? (
            <div className="grid grid-cols-2 gap-2.5">
              {items
                .filter((i) => !placedItemIds.has(i.id))
                .map((item) => (
                  <Chip
                    key={item.id}
                    selected={selectedItemId === item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setSpatialError(null);
                    }}
                    className="w-full justify-center py-2.5"
                  >
                    <span className="text-center leading-tight">
                      <span className="block text-sm font-bold">{item.label.jaPlain}</span>
                      <span className="block text-[11px] opacity-85">
                        {settings.langPreset === 'jp_id' || settings.langPreset === 'jp_id_en'
                          ? item.label.id
                          : item.label.en}
                      </span>
                    </span>
                  </Chip>
                ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-card)] bg-[#E1DAFB] p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#4D3EA3] font-bold text-sm">
                <CheckCircle2 size={18} aria-hidden="true" />
                Layout verified
              </div>
              <button
                type="button"
                onClick={() => switchRound(round === 'washoku' ? 'western' : 'etiquette')}
                className="min-h-[48px] px-4 rounded-[var(--radius-chip)] bg-[#1D1D1F] text-white text-xs font-bold"
              >
                {round === 'washoku' ? 'Next: Western Setting' : 'Next: Etiquette'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
