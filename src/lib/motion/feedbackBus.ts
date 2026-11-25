import type { FeedbackSignal } from './tokens';

type FeedbackListener = (signal: FeedbackSignal) => void;

const listeners = new Set<FeedbackListener>();

/** Emit a semantic feedback signal to listeners such as LiquidBackground's rAF loop. */
export function emitFeedback(signal: FeedbackSignal): void {
  const clamped: FeedbackSignal = signal.shaderPulse
    ? {
        ...signal,
        shaderPulse: {
          ...signal.shaderPulse,
          energy: Math.min(0.4, Math.max(0, signal.shaderPulse.energy)),
        },
      }
    : signal;

  for (const listener of listeners) {
    listener(clamped);
  }
}

export function subscribeFeedback(listener: FeedbackListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
