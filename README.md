# Opal

Offline-first active recall, hospitality drills, and CBT simulator for Japanese Specified Skilled Worker (SSW) Level 1 Accommodation exam preparation.

## Features
- **Spaced Repetition Flashcards**: 211 bilingual/trilingual flashcards (`JP+ID`, `JP+EN`, `JP+ID+EN`, `JP`) with `On`, `Peek`, and `Off` furigana modes, bookmarking, leech detection, and SM-2 scheduling persisted in IndexedDB.
- **Japanese Text-to-Speech**: Question and answer audio aligned with displayed Japanese text via Web Speech API and native Android `TextToSpeech` inside the APK.
- **Interactive Drills**:
  - **Sequence Builder**: Step-by-step ordering for kaiseki, Western course service, front desk workflow, and complaint handling.
  - **Table & Etiquette**: Interactive Washoku Ichiju-Sansai tray and Western table placement plus service etiquette checks.
  - **Revenue Math Sprint**: OCC, ADR, and RevPAR problem generator with mobile keypad supporting `,` and `.`.
  - **Ojigi & Keigo**: Bowing angle (`15°`, `30°`, `45°`) and honorifics classifier.
- **CBT Simulator**: 100 multiple-choice exam questions with Practice (instant rationale) and timed Exam (`30Q / 30m`) modes.
- **Local Analytics & Backup**: 7-day study bar chart, chapter mastery rings, weak-spot focus, and JSON export/import backup.

## Development & Build

```bash
pnpm install
pnpm validate:data
pnpm test
pnpm typecheck
pnpm build
pnpm verify:ui
```

## Android APK Build

```bash
pnpm build
pnpm build:apk
```

Outputs a v2/v3 signed offline Android WebView APK to `dist/Opal-v<version>.apk`.
