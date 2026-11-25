export interface TTSAvailability {
  supported: boolean;
  hasJapaneseVoice: boolean;
  voiceName: string | null;
  isLocalVoice: boolean;
}

interface AndroidTTSBridge {
  isAvailable?: () => boolean;
  speak?: (text: string, rate: number) => void;
  stop?: () => void;
}

declare global {
  interface Window {
    AndroidTTS?: AndroidTTSBridge;
    __onAndroidTTSEnd?: () => void;
  }
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let activeUtteranceToken = 0;
let activeEndTimer: number | null = null;
const activeListeners = new Set<(token: number) => void>();

function notifyActiveListeners(token: number): void {
  for (const listener of activeListeners) {
    listener(token);
  }
}

export function subscribeActiveTTS(listener: (token: number) => void): () => void {
  activeListeners.add(listener);
  return () => {
    activeListeners.delete(listener);
  };
}

/**
 * Normalizes displayed Japanese text for accurate Japanese speech synthesis:
 * strips English-only parenthetical glosses (e.g. "(accommodation tax)") and
 * structural brackets while preserving all Japanese wording faithfully.
 */
export function formatJapaneseForTTS(raw: string): string {
  return raw
    .replace(/[（(][A-Za-z0-9\s.,/&+\-:'"]+[)）]/g, '')
    .replace(/[「」『』]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectJapaneseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const jaVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ja'));
  if (jaVoices.length === 0) return null;
  const local = jaVoices.find((v) => v.localService);
  return local ?? jaVoices[0];
}

export function getTTSAvailability(): TTSAvailability {
  if (typeof window === 'undefined') {
    return { supported: false, hasJapaneseVoice: false, voiceName: null, isLocalVoice: false };
  }
  if (window.AndroidTTS?.speak) {
    const ok = window.AndroidTTS.isAvailable ? Boolean(window.AndroidTTS.isAvailable()) : true;
    return {
      supported: true,
      hasJapaneseVoice: ok,
      voiceName: ok ? 'Android System ja-JP' : null,
      isLocalVoice: true,
    };
  }
  if (!('speechSynthesis' in window)) {
    return { supported: false, hasJapaneseVoice: false, voiceName: null, isLocalVoice: false };
  }
  const voices = window.speechSynthesis.getVoices();
  const voice = selectJapaneseVoice(voices);
  cachedVoice = voice;
  return {
    supported: true,
    hasJapaneseVoice: Boolean(voice),
    voiceName: voice?.name ?? null,
    isLocalVoice: Boolean(voice?.localService),
  };
}

export function stopSpeaking(): void {
  activeUtteranceToken += 1;
  if (activeEndTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(activeEndTimer);
    activeEndTimer = null;
  }
  notifyActiveListeners(0);
  if (typeof window === 'undefined') return;
  try {
    window.AndroidTTS?.stop?.();
  } catch {
    // Ignore native bridge stop failures
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakJapanese(
  text: string,
  rate: 0.75 | 1.0 | 1.2 = 1.0,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): number | null {
  if (typeof window === 'undefined') {
    callbacks?.onError?.();
    return null;
  }

  const spoken = formatJapaneseForTTS(text);
  if (!spoken) {
    callbacks?.onError?.();
    return null;
  }

  stopSpeaking();
  const token = ++activeUtteranceToken;

  if (window.AndroidTTS?.speak) {
    try {
      notifyActiveListeners(token);
      callbacks?.onStart?.();
      window.__onAndroidTTSEnd = () => {
        if (activeUtteranceToken === token) {
          notifyActiveListeners(0);
          callbacks?.onEnd?.();
        }
      };
      window.AndroidTTS.speak(spoken, rate);
      // Fallback clear in case WebView lifecycle misses callback
      const approxMs = Math.max(1800, Math.round((spoken.length * 145) / rate));
      activeEndTimer = window.setTimeout(() => {
        if (activeUtteranceToken === token) {
          notifyActiveListeners(0);
          callbacks?.onEnd?.();
        }
      }, approxMs);
      return token;
    } catch {
      notifyActiveListeners(0);
      callbacks?.onError?.();
      return null;
    }
  }

  if (!('speechSynthesis' in window)) {
    callbacks?.onError?.();
    return null;
  }

  try {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;

    const voice = cachedVoice ?? selectJapaneseVoice(synth.getVoices());
    if (voice) {
      cachedVoice = voice;
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      if (activeUtteranceToken === token) {
        notifyActiveListeners(token);
        callbacks?.onStart?.();
      }
    };
    utterance.onend = () => {
      if (activeUtteranceToken === token) {
        notifyActiveListeners(0);
        callbacks?.onEnd?.();
      }
    };
    utterance.onerror = () => {
      if (activeUtteranceToken === token) {
        notifyActiveListeners(0);
        callbacks?.onError?.();
      }
    };

    notifyActiveListeners(token);
    synth.speak(utterance);
    return token;
  } catch {
    notifyActiveListeners(0);
    callbacks?.onError?.();
    return null;
  }
}
