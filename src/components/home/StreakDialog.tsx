'use client';

import { useEffect, useId, type RefObject } from 'react';
import { Check } from 'lucide-react';
import { getStreakCycleDays } from '@/lib/analytics';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { emitFeedback } from '@/lib/motion/feedbackBus';

interface StreakDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  streak: number;
  todayReviews: number;
  dailyGoal: number;
  onContinue: () => void;
  onNativeClose: () => void;
}

function WarmFlameEmblem() {
  const uid = useId().replace(/:/g, '');
  const outerGrad = `flame-outer-${uid}`;
  const innerGrad = `flame-inner-${uid}`;
  const glowGrad = `flame-glow-${uid}`;

  return (
    <div className="relative flex items-center justify-center w-40 h-40 select-none">
      {/* Subtle static warm radial aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,122,26,0.34) 0%, rgba(255,179,71,0.12) 45%, transparent 72%)',
        }}
      />

      {/* Ambient warm embers */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-5 left-7 w-1.5 h-1.5 rounded-full bg-[#FFB347]/65"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-9 right-6 w-2 h-2 rounded-full bg-[#FF7A1A]/50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 left-5 w-1 h-1 rounded-full bg-[#FFD2F4]/60"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 right-8 w-1.5 h-1.5 rounded-full bg-[#FFB347]/55"
      />

      <svg
        width="108"
        height="120"
        viewBox="0 0 108 120"
        fill="none"
        aria-hidden="true"
        className="relative z-10 drop-shadow-[0_12px_28px_rgba(255,122,26,0.45)]"
      >
        <defs>
          <radialGradient id={glowGrad} cx="50%" cy="62%" r="55%">
            <stop offset="0%" stopColor="#FFF2DF" />
            <stop offset="48%" stopColor="#FFB347" />
            <stop offset="100%" stopColor="#FF7A1A" />
          </radialGradient>
          <linearGradient id={outerGrad} x1="54" y1="8" x2="54" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFD08A" />
            <stop offset="38%" stopColor="#FF7A1A" />
            <stop offset="100%" stopColor="#C94500" />
          </linearGradient>
          <linearGradient id={innerGrad} x1="54" y1="42" x2="54" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF7EB" />
            <stop offset="55%" stopColor="#FFB85C" />
            <stop offset="100%" stopColor="#FF6B00" />
          </linearGradient>
        </defs>

        {/* Outer flame body */}
        <path
          d="M55.2 10.5C56.8 25.4 45.2 33.8 41.6 45.2C39.2 52.8 41.1 58.6 44.3 62.6C38.4 58.1 35.8 50.2 37.3 41.4C24.5 50.8 18 64.9 18 78.8C18 98.4 33.9 112 54 112C74.1 112 90 98.4 90 78.6C90 61.9 80.2 49.4 72.1 40.3C64.2 31.4 57.1 22.8 55.2 10.5Z"
          fill={`url(#${outerGrad})`}
          stroke="rgba(255, 224, 181, 0.52)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Secondary translucent side lick */}
        <path
          d="M58.5 38.2C66.4 48.2 76.2 59.8 76.2 77.5C76.2 92.2 66.5 103 54 103C43.1 103 34.4 94.3 34.4 81.2C34.4 69.8 41.8 61.2 47.4 54.6C51.4 49.8 55.9 44.8 58.5 38.2Z"
          fill={`url(#${glowGrad})`}
          opacity="0.82"
        />

        {/* Bright inner flame core */}
        <path
          d="M54.3 54.5C58.8 63.4 66.2 71.1 66.2 82.8C66.2 92.4 60.8 100.2 53.8 100.2C46.8 100.2 41.8 93.2 41.8 83.6C41.8 75.5 47.8 68.4 52.3 61.2C53.2 59.7 53.8 57.3 54.3 54.5Z"
          fill={`url(#${innerGrad})`}
        />
      </svg>
    </div>
  );
}

export function StreakDialog({
  dialogRef,
  streak,
  todayReviews,
  dailyGoal,
  onContinue,
  onNativeClose,
}: StreakDialogProps) {
  const days = getStreakCycleDays(streak);
  const titleText = streak === 1 ? 'Day Streak' : 'Days Streak';

  // Ensure native close / Esc / light-dismiss cleanly resets returnValue & notifies parent
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onNativeClose();
    };
    dialog.addEventListener('close', handleClose);

    if ('closedBy' in HTMLDialogElement.prototype) {
      return () => dialog.removeEventListener('close', handleClose);
    }

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
    };
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, [dialogRef, onNativeClose]);

  const handleContinueClick = () => {
    emitFeedback({
      intent: 'caution',
      shaderPulse: { energy: 0.24, origin: [0.5, 0.85] },
    });
    onContinue();
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      data-vt-id="streak-stage"
      aria-labelledby="streak-dialog-title"
      className="streak-dialog px-5 pt-[calc(2.5rem+env(safe-area-inset-top,0px))] pb-[calc(2.25rem+env(safe-area-inset-bottom,0px))]"
    >
      <div aria-hidden="true" className="h-2 shrink-0" />

      <div className="w-full max-w-[380px] mx-auto flex flex-col items-center text-center">
        <WarmFlameEmblem />

        <div className="w-full flex items-center gap-4 mt-2">
          <div aria-hidden="true" className="h-px flex-1 bg-white/14" />
          <span className="text-[56px] font-bold leading-none tabular-nums text-[#FF7A1A]">
            <AnimatedNumber value={streak} />
          </span>
          <div aria-hidden="true" className="h-px flex-1 bg-white/14" />
        </div>

        <h1
          id="streak-dialog-title"
          className="text-2xl font-bold tracking-tight text-[#FF7A1A] mt-3"
        >
          {titleText}
        </h1>

        <p className="text-sm text-[#B4B4B8] mt-3 max-w-[28ch] leading-relaxed">
          {streak > 0
            ? 'Maintain a daily streak by focusing a little bit every day.'
            : 'Complete 1 flashcard review, drill, or CBT check today to start Day 1.'}
        </p>

        <div className="w-full rounded-[22px] border border-white/14 bg-white/[0.04] px-3 py-4 mt-7">
          <div className="grid grid-cols-7 gap-1.5 items-center">
            {days.map((d) => (
              <div key={d.dayNumber} className="flex flex-col items-center gap-2 min-w-0">
                <div
                  aria-label={`${d.label}: ${d.completed ? 'completed' : 'upcoming'}`}
                  className={[
                    'w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-colors',
                    d.completed
                      ? 'bg-white border-white text-[#0B0B0F] shadow-[0_2px_10px_rgba(255,255,255,0.22)]'
                      : 'bg-white/[0.04] border-white/22 text-transparent',
                  ].join(' ')}
                >
                  {d.completed ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : null}
                </div>
                <span
                  className={[
                    'text-[11px] font-semibold tabular-nums whitespace-nowrap',
                    d.completed ? 'text-white' : 'text-[#9C9CA4]',
                  ].join(' ')}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs font-semibold text-[#9C9CA4] mt-3 tabular-nums">
          Today: {todayReviews}/{dailyGoal} daily goal
        </p>
      </div>

      <div className="w-full max-w-[380px] mx-auto pt-4 shrink-0">
        <InteractiveSurface
          type="button"
          intent="caution"
          pressScale={0.96}
          onClick={handleContinueClick}
          className="streak-continue-btn w-full min-h-[54px] rounded-[var(--radius-pill)] text-[#1D1D1F] text-base font-bold shadow-[0_8px_24px_rgba(255,255,255,0.14)] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F7 55%, #DFDFE6 100%)',
          }}
        >
          Continue
        </InteractiveSurface>
      </div>
    </dialog>
  );
}
