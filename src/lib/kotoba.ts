import type {
  ChapterId,
  KotobaCardItem,
  KotobaCategory,
  KotobaFrontMode,
  KotobaSRSState,
  KotobaWordType,
} from './types';

export type KotobaStatusFilter =
  | 'all'
  | 'due'
  | 'new'
  | 'learning'
  | 'mastered'
  | 'weak'
  | 'bookmarked';

export interface KotobaFilterState {
  category: KotobaCategory | 'all';
  chapter: ChapterId | 'all';
  wordType: KotobaWordType | 'all';
  status: KotobaStatusFilter;
}

export const KOTOBA_CATEGORY_LABELS: Record<KotobaCategory, string> = {
  front_desk: 'Front Desk',
  planning_revenue: 'Planning & PR',
  customer_keigo: 'Service & Keigo',
  restaurant_food: 'Restaurant',
  safety_hygiene: 'Safety & Hygiene',
  kanji_compounds: 'Kanji Compounds',
};

export const KOTOBA_WORD_TYPE_LABELS: Record<KotobaWordType, string> = {
  kanji: 'Kanji',
  katakana: 'Katakana',
  phrase: 'Phrase',
  keigo: 'Keigo',
};

export const KOTOBA_FRONT_MODE_LABELS: Record<KotobaFrontMode, string> = {
  jp_to_meaning: 'JP -> Arti',
  meaning_to_jp: 'Arti -> JP',
  kana_to_kanji: 'Kana -> Kanji',
};

export function getKotobaCardStatus(
  state: KotobaSRSState | undefined,
  nowMs: number
): Exclude<KotobaStatusFilter, 'all'>[] {
  const tags: Exclude<KotobaStatusFilter, 'all'>[] = [];
  if (!state) {
    tags.push('new', 'due');
    return tags;
  }
  if (state.dueTimestamp <= nowMs) tags.push('due');
  if (state.repetitions === 0 && state.reviewCount === 0) tags.push('new');
  else if (state.intervalDays >= 7) tags.push('mastered');
  else tags.push('learning');
  if (state.lapses >= 2 || (state.reviewCount >= 3 && state.correctCount / state.reviewCount < 0.6)) {
    tags.push('weak');
  }
  if (state.bookmarked) tags.push('bookmarked');
  return tags;
}

export function filterKotobaCards(
  cards: KotobaCardItem[],
  statesById: Map<string, KotobaSRSState>,
  filters: KotobaFilterState,
  nowMs: number,
  searchQuery = ''
): KotobaCardItem[] {
  const q = searchQuery.trim().toLowerCase();
  return cards.filter((card) => {
    if (filters.category !== 'all' && card.category !== filters.category) return false;
    if (filters.chapter !== 'all' && card.chapter !== filters.chapter) return false;
    if (filters.wordType !== 'all' && card.wordType !== filters.wordType) return false;
    if (filters.status !== 'all') {
      const statuses = getKotobaCardStatus(statesById.get(card.id), nowMs);
      if (!statuses.includes(filters.status)) return false;
    }
    if (q) {
      const haystack = [
        card.word.jaPlain,
        card.readingKana,
        card.romaji ?? '',
        card.word.id,
        card.word.en,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export interface KotobaQuizQuestion {
  target: KotobaCardItem;
  options: KotobaCardItem[];
}

export function buildKotobaQuiz(
  pool: KotobaCardItem[],
  allCards: KotobaCardItem[],
  maxCount = 10,
  rng: () => number = Math.random
): KotobaQuizQuestion[] {
  if (pool.length === 0) return [];
  const shuffledTargets = [...pool];
  for (let i = shuffledTargets.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledTargets[i], shuffledTargets[j]] = [shuffledTargets[j], shuffledTargets[i]];
  }
  const byId = new Map(allCards.map((c) => [c.id, c]));
  const targets = shuffledTargets.slice(0, Math.min(maxCount, shuffledTargets.length));

  return targets.map((target) => {
    const distractors: KotobaCardItem[] = [];
    const seen = new Set<string>([target.id]);

    for (const trapId of target.confusableWith ?? []) {
      const found = byId.get(trapId);
      if (found && !seen.has(found.id) && distractors.length < 3) {
        seen.add(found.id);
        distractors.push(found);
      }
    }

    const candidates = allCards.filter((c) => !seen.has(c.id));
    candidates.sort((a, b) => {
      const aScore = (a.category === target.category ? 2 : 0) + (a.wordType === target.wordType ? 1 : 0);
      const bScore = (b.category === target.category ? 2 : 0) + (b.wordType === target.wordType ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return rng() - 0.5;
    });

    for (const c of candidates) {
      if (distractors.length >= 3) break;
      seen.add(c.id);
      distractors.push(c);
    }

    const options = [target, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { target, options };
  });
}
