export type ChapterId = 1 | 2 | 3 | 4 | 5;
export type FuriganaMode = 'on' | 'peek' | 'off';
export type LangPreset = 'jp_id' | 'jp_en' | 'jp_id_en' | 'jp_only';
export type SRSRating = 'again' | 'hard' | 'good' | 'easy';
export type DrillId = 'sequence' | 'table' | 'math' | 'ojigi_keigo' | 'kotoba';

export type KotobaCategory =
  | 'front_desk'
  | 'planning_revenue'
  | 'customer_keigo'
  | 'restaurant_food'
  | 'safety_hygiene'
  | 'kanji_compounds';

export type KotobaWordType = 'kanji' | 'katakana' | 'phrase' | 'keigo';
export type KotobaFrontMode = 'jp_to_meaning' | 'meaning_to_jp' | 'kana_to_kanji';
export type KotobaStudyMode = 'srs' | 'free' | 'quiz';

export interface KanjiPart {
  char: string;
  on: string;
  kun: string;
  meaningId: string;
  meaningEn: string;
}

export interface KotobaCardItem {
  id: string;
  chapter: ChapterId;
  pdfPage: number;
  category: KotobaCategory;
  wordType: KotobaWordType;
  word: TrilingualText;
  readingKana: string;
  romaji?: string;
  pitchAccent?: string;
  kanjiBreakdown?: KanjiPart[];
  example?: TrilingualText;
  confusableWith?: string[];
  tags: string[];
  ttsText: string;
}

export interface KotobaSRSState {
  cardId: string;
  chapter: ChapterId;
  category: KotobaCategory;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  lapses: number;
  correctCount: number;
  reviewCount: number;
  dueTimestamp: number;
  lastReviewedAt: number | null;
  bookmarked: boolean;
}

export interface TrilingualText {
  /** Japanese HTML string using strictly <ruby>Kanji<rt>kana</rt></ruby> tags */
  jaRuby: string;
  /** Plain Japanese string without furigana (used for search, TTS fallback, and 'off' mode) */
  jaPlain: string;
  /** Natural, accurate Indonesian translation */
  id: string;
  /** English text aligned with the official SSW textbook */
  en: string;
}

export interface FlashcardItem {
  id: string;
  chapter: ChapterId;
  section: string;
  pdfPage: number;
  tags: string[];
  prompt: TrilingualText;
  answer: TrilingualText;
  ttsText: string;
  examTip?: {
    id: string;
    en: string;
  };
}

export interface CBTQuestionItem {
  id: string;
  chapter: ChapterId;
  pdfPage: number;
  question: TrilingualText;
  options: Array<{
    key: 'A' | 'B' | 'C' | 'D';
    text: TrilingualText;
  }>;
  correctKey: 'A' | 'B' | 'C' | 'D';
  rationale: TrilingualText;
}

export interface SRSCardState {
  cardId: string;
  chapter: ChapterId;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  lapses: number;
  correctCount: number;
  reviewCount: number;
  dueTimestamp: number;
  lastReviewedAt: number | null;
  bookmarked: boolean;
}

export interface CBTAttemptRecord {
  id: string;
  timestamp: number;
  mode: 'practice' | 'exam';
  chaptersIncluded: ChapterId[];
  totalQuestions: number;
  correctCount: number;
  wrongQuestionIds: string[];
  durationSec: number;
}

export interface CBTWeakRecord {
  questionId: string;
  chapter: ChapterId;
  wrongCount: number;
  consecutiveCorrect: number;
  lastMissedAt: number;
}

export interface DrillProgressRecord {
  drillId: DrillId;
  bestAccuracy: number;
  completedCount: number;
  lastPlayedAt: number;
}

export interface DailyActivityLog {
  dateKey: string;
  reviewsCompleted: number;
  cbtAnswered: number;
  drillsCompleted: number;
  studySeconds: number;
}

export interface UserSettings {
  furiganaMode: FuriganaMode;
  langPreset: LangPreset;
  hideTranslation: boolean;
  dailyGoal: number;
  ttsRate: 0.75 | 1.0 | 1.2;
  ttsAutoPlay: boolean;
  ecoMode: boolean;
}

export interface BackupPayloadV1 {
  schemaVersion: 1;
  exportedAt: string;
  srs_states: SRSCardState[];
  kotoba_states?: KotobaSRSState[];
  cbt_attempts: CBTAttemptRecord[];
  cbt_weak_ids: CBTWeakRecord[];
  drill_progress: DrillProgressRecord[];
  daily_logs: DailyActivityLog[];
  settings: UserSettings;
}

export interface BackupPayloadV2 {
  schemaVersion: 2;
  exportedAt: string;
  srs_states: SRSCardState[];
  kotoba_states: KotobaSRSState[];
  cbt_attempts: CBTAttemptRecord[];
  cbt_weak_ids: CBTWeakRecord[];
  drill_progress: DrillProgressRecord[];
  daily_logs: DailyActivityLog[];
  settings: UserSettings;
}

export type BackupPayload = BackupPayloadV1 | BackupPayloadV2;

export interface SequenceStep {
  id: string;
  order: number;
  text: TrilingualText;
}

export interface SequenceDataset {
  id: string;
  title: TrilingualText;
  pdfPage: number;
  steps: SequenceStep[];
}

export interface TablePlacementItem {
  id: string;
  zoneId: string;
  label: TrilingualText;
}

export interface TableZone {
  id: string;
  number: number;
  positionLabel: { id: string; en: string };
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TableEtiquetteRule {
  id: string;
  question: TrilingualText;
  options: Array<{ key: string; text: TrilingualText }>;
  correctKey: string;
  explanation: TrilingualText;
  pdfPage: number;
}

export interface OjigiItem {
  id: string;
  angle: '15' | '30' | '45';
  scenario: TrilingualText;
  pdfPage: number;
}

export interface KeigoItem {
  id: string;
  category: 'sonkeigo' | 'kenjougo' | 'teineigo';
  phrase: TrilingualText;
  note: { id: string; en: string };
  pdfPage: number;
}

export interface DrillsStaticData {
  sequences: SequenceDataset[];
  washokuZones: TableZone[];
  washokuItems: TablePlacementItem[];
  westernZones: TableZone[];
  westernItems: TablePlacementItem[];
  etiquetteRules: TableEtiquetteRule[];
  ojigiScenarios: OjigiItem[];
  keigoItems: KeigoItem[];
}
