import ch01 from '@/data/ch01_front_desk.json';
import ch02 from '@/data/ch02_planning_pr.json';
import ch03 from '@/data/ch03_customer_service.json';
import ch04 from '@/data/ch04_restaurant.json';
import ch05 from '@/data/ch05_safety_hygiene.json';
import cbtBank from '@/data/cbt_bank.json';
import drillsStatic from '@/data/drills_static.json';
import type { CBTQuestionItem, ChapterId, DrillsStaticData, FlashcardItem } from './types';

export const ALL_FLASHCARDS: FlashcardItem[] = [
  ...(ch01 as FlashcardItem[]),
  ...(ch02 as FlashcardItem[]),
  ...(ch03 as FlashcardItem[]),
  ...(ch04 as FlashcardItem[]),
  ...(ch05 as FlashcardItem[]),
];

export const ALL_CBT_QUESTIONS: CBTQuestionItem[] = cbtBank as CBTQuestionItem[];
export const DRILLS_DATA: DrillsStaticData = drillsStatic as DrillsStaticData;

export function getCardsForChapter(chapter: ChapterId): FlashcardItem[] {
  return ALL_FLASHCARDS.filter((c) => c.chapter === chapter);
}
