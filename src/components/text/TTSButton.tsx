'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { InteractiveSurface } from '@/components/motion/InteractiveSurface';
import { SemanticIcon } from '@/components/motion/SemanticIcon';
import { speakJapanese, stopSpeaking, subscribeActiveTTS } from '@/lib/tts';
import { useApp } from '@/components/AppProvider';

interface TTSButtonProps {
  text: string;
  variant?: 'light' | 'dark';
  ariaLabel?: string;
  className?: string;
}

export function TTSButton({
  text,
  variant = 'light',
  ariaLabel,
  className = '',
}: TTSButtonProps) {
  const { settings } = useApp();
  const [speaking, setSpeaking] = useState(false);
  const [speakTick, setSpeakTick] = useState(0);
  const myTokenRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribeActiveTTS((activeToken) => {
      if (myTokenRef.current !== null && activeToken !== myTokenRef.current) {
        myTokenRef.current = null;
        setSpeaking(false);
      }
    });
  }, []);

  useEffect(() => {
    if (myTokenRef.current !== null) {
      stopSpeaking();
      myTokenRef.current = null;
      setSpeaking(false);
    }
  }, [text]);

  useEffect(() => {
    return () => {
      if (myTokenRef.current !== null) {
        stopSpeaking();
        myTokenRef.current = null;
      }
    };
  }, []);

  const handleToggle = () => {
    if (speaking) {
      stopSpeaking();
      myTokenRef.current = null;
      setSpeaking(false);
      return;
    }
    const token = speakJapanese(text, settings.ttsRate, {
      onStart: () => setSpeaking(true),
      onEnd: () => {
        myTokenRef.current = null;
        setSpeaking(false);
      },
      onError: () => {
        myTokenRef.current = null;
        setSpeaking(false);
      },
    });
    if (token !== null) {
      myTokenRef.current = token;
      setSpeakTick((t) => t + 1);
      setSpeaking(true);
    } else {
      setSpeaking(false);
    }
  };

  const palette =
    variant === 'dark'
      ? speaking
        ? 'bg-white text-[#1D1D1F]'
        : 'bg-white/14 text-white hover:bg-white/22'
      : speaking
        ? 'bg-[#4D3EA3] text-white'
        : 'bg-[#E1DAFB] text-[#4D3EA3] hover:bg-[#d4cbf8]';

  const label = speaking
    ? 'Stop Japanese pronunciation'
    : ariaLabel ?? 'Listen to Japanese pronunciation';

  return (
    <InteractiveSurface
      type="button"
      onClick={handleToggle}
      ariaPressed={speaking}
      ariaLabel={label}
      intent="primary"
      pressScale={0.94}
      feedbackKey={speakTick}
      emitAmbientPulse={speakTick > 0}
      className={[
        'inline-flex items-center justify-center w-12 h-12 min-w-[48px] min-h-[48px] rounded-[var(--radius-chip)] shrink-0',
        palette,
        className,
      ].join(' ')}
    >
      <SemanticIcon behavior="soundwave" active={speaking}>
        {speaking ? (
          <Square size={18} fill="currentColor" aria-hidden="true" />
        ) : (
          <Volume2 size={20} strokeWidth={2} aria-hidden="true" />
        )}
      </SemanticIcon>
    </InteractiveSurface>
  );
}
