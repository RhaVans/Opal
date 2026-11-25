export type InteractionIntent =
  | 'neutral'
  | 'primary'
  | 'positive'
  | 'negative'
  | 'caution'
  | 'accent';

export type IconBehavior =
  | 'none'
  | 'nudge-right'
  | 'nudge-left'
  | 'pop-fill'
  | 'spin-cw'
  | 'spin-half'
  | 'draw-check'
  | 'shake-x'
  | 'rock-bell'
  | 'soundwave'
  | 'eye-blink';

export interface FeedbackSignal {
  intent: InteractionIntent;
  shaderPulse?: {
    energy: number;
    origin?: [number, number];
  };
}

export const DURATIONS = {
  instant: 90,
  micro: 160,
  standard: 260,
  macro: 380,
  decay: 520,
} as const;

export const EASINGS = {
  standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
  decel: 'cubic-bezier(0.16, 1, 0.3, 1)',
  accel: 'cubic-bezier(0.4, 0, 1, 1)',
  flash: 'cubic-bezier(0.25, 0.9, 0.35, 1)',
  springSnappy: 'linear(0, 0.48 18%, 1.12 42%, 0.96 68%, 1)',
} as const;

export const INTENT_SHADER_RGB: Record<InteractionIntent, [number, number, number]> = {
  neutral: [0.459, 0.541, 0.820],   // #758AD1 Glaucous
  primary: [0.302, 0.243, 0.639],   // #4D3EA3 Persian Blue
  positive: [0.122, 0.659, 0.478],  // #1FA87A Emerald
  negative: [0.800, 0.184, 0.322],  // #CC2F52 AA Crimson
  caution: [0.878, 0.557, 0.169],   // #E08E2B Amber
  accent: [1.000, 0.824, 0.957],    // #FFD2F4 Petal Frost
};

export const INTENT_FLASH_STYLES: Record<
  InteractionIntent,
  { border: string; wash: string }
> = {
  neutral: {
    border: 'rgba(255, 255, 255, 0.72)',
    wash: 'rgba(225, 218, 251, 0.24)',
  },
  primary: {
    border: 'rgba(77, 62, 163, 0.68)',
    wash: 'rgba(225, 218, 251, 0.36)',
  },
  positive: {
    border: 'rgba(31, 168, 122, 0.72)',
    wash: 'rgba(31, 168, 122, 0.14)',
  },
  negative: {
    border: 'rgba(204, 47, 82, 0.78)',
    wash: 'rgba(204, 47, 82, 0.14)',
  },
  caution: {
    border: 'rgba(224, 142, 43, 0.72)',
    wash: 'rgba(224, 142, 43, 0.14)',
  },
  accent: {
    border: 'rgba(117, 138, 209, 0.70)',
    wash: 'rgba(255, 210, 244, 0.30)',
  },
};
