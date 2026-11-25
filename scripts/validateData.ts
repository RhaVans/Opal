import fs from 'node:fs';
import path from 'node:path';
import type { CBTQuestionItem, DrillsStaticData, FlashcardItem, TrilingualText } from '../src/lib/types';
import { hasMalformedHtmlOutsideRuby, parseRubyTokens } from '../src/lib/furigana';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

const CHAPTER_FILES: Array<{ file: string; chapter: number; minPage: number; maxPage: number; minCount: number }> = [
  { file: 'ch01_front_desk.json', chapter: 1, minPage: 5, maxPage: 21, minCount: 28 },
  { file: 'ch02_planning_pr.json', chapter: 2, minPage: 23, maxPage: 35, minCount: 30 },
  { file: 'ch03_customer_service.json', chapter: 3, minPage: 37, maxPage: 50, minCount: 40 },
  { file: 'ch04_restaurant.json', chapter: 4, minPage: 52, maxPage: 66, minCount: 40 },
  { file: 'ch05_safety_hygiene.json', chapter: 5, minPage: 68, maxPage: 75, minCount: 28 },
];

const errors: string[] = [];

function checkTrilingual(ctx: string, t: TrilingualText | undefined) {
  if (!t) {
    errors.push(`${ctx}: missing TrilingualText`);
    return;
  }
  for (const field of ['jaRuby', 'jaPlain', 'id', 'en'] as const) {
    if (typeof t[field] !== 'string' || t[field].trim().length === 0) {
      errors.push(`${ctx}: missing or empty field "${field}"`);
    }
    if (typeof t[field] === 'string' && (t[field].includes('—') || t[field].includes('–'))) {
      errors.push(`${ctx}.${field}: contains forbidden em/en dash (R-02)`);
    }
  }
  if (typeof t.jaRuby === 'string') {
    if (hasMalformedHtmlOutsideRuby(t.jaRuby)) {
      errors.push(`${ctx}.jaRuby: malformed HTML or unclosed <ruby>/<rt> tag: ${t.jaRuby}`);
    }
    const tokens = parseRubyTokens(t.jaRuby);
    for (const tok of tokens) {
      if (tok.type === 'ruby' && (!tok.base.trim() || !tok.reading.trim())) {
        errors.push(`${ctx}.jaRuby: empty ruby base or reading in ${t.jaRuby}`);
      }
    }
  }
}

const allCardIds = new Set<string>();
const allCards: FlashcardItem[] = [];

for (const cfg of CHAPTER_FILES) {
  const fullPath = path.join(DATA_DIR, cfg.file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing dataset file: ${cfg.file}`);
    continue;
  }
  const items = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as FlashcardItem[];
  if (!Array.isArray(items)) {
    errors.push(`${cfg.file}: must export a JSON array`);
    continue;
  }
  if (items.length < cfg.minCount) {
    errors.push(`${cfg.file}: expected at least ${cfg.minCount} cards, found ${items.length}`);
  }
  for (const card of items) {
    if (!card.id) errors.push(`${cfg.file}: card missing id`);
    else if (allCardIds.has(card.id)) errors.push(`${cfg.file}: duplicate card id "${card.id}"`);
    else allCardIds.add(card.id);

    if (card.chapter !== cfg.chapter) {
      errors.push(`${card.id}: chapter ${card.chapter} != ${cfg.chapter}`);
    }
    if (typeof card.pdfPage !== 'number' || card.pdfPage < cfg.minPage || card.pdfPage > cfg.maxPage) {
      errors.push(`${card.id}: pdfPage ${card.pdfPage} out of range [${cfg.minPage}, ${cfg.maxPage}]`);
    }
    if (!card.section?.trim()) errors.push(`${card.id}: missing section`);
    if (!card.ttsText?.trim()) errors.push(`${card.id}: missing ttsText`);
    if (!Array.isArray(card.tags) || card.tags.length === 0) errors.push(`${card.id}: missing tags`);
    checkTrilingual(`${card.id}.prompt`, card.prompt);
    checkTrilingual(`${card.id}.answer`, card.answer);
    if (card.examTip) {
      if (card.examTip.id.includes('—') || card.examTip.en.includes('—')) {
        errors.push(`${card.id}.examTip: contains em dash`);
      }
    }
    allCards.push(card);
  }
}

// Validate CBT bank
const cbtPath = path.join(DATA_DIR, 'cbt_bank.json');
let cbtQuestions: CBTQuestionItem[] = [];
if (!fs.existsSync(cbtPath)) {
  errors.push('Missing cbt_bank.json');
} else {
  cbtQuestions = JSON.parse(fs.readFileSync(cbtPath, 'utf-8')) as CBTQuestionItem[];
  if (cbtQuestions.length < 95) {
    errors.push(`cbt_bank.json: expected ~100 questions (>= 95), found ${cbtQuestions.length}`);
  }
  const cbtIds = new Set<string>();
  for (const q of cbtQuestions) {
    if (!q.id) errors.push('cbt question missing id');
    else if (cbtIds.has(q.id)) errors.push(`duplicate cbt id ${q.id}`);
    else cbtIds.add(q.id);

    if (q.pdfPage < 5 || q.pdfPage > 75) {
      errors.push(`${q.id}: pdfPage ${q.pdfPage} out of range 5..75`);
    }
    checkTrilingual(`${q.id}.question`, q.question);
    checkTrilingual(`${q.id}.rationale`, q.rationale);
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`${q.id}: must have 4 options`);
    } else {
      const keys = q.options.map((o) => o.key).sort().join(',');
      if (keys !== 'A,B,C,D') errors.push(`${q.id}: option keys invalid (${keys})`);
      for (const opt of q.options) {
        checkTrilingual(`${q.id}.option.${opt.key}`, opt.text);
      }
    }
    if (!['A', 'B', 'C', 'D'].includes(q.correctKey)) {
      errors.push(`${q.id}: invalid correctKey ${q.correctKey}`);
    }
  }
}

// Validate drills_static.json
const drillsPath = path.join(DATA_DIR, 'drills_static.json');
if (!fs.existsSync(drillsPath)) {
  errors.push('Missing drills_static.json');
} else {
  const drills = JSON.parse(fs.readFileSync(drillsPath, 'utf-8')) as DrillsStaticData;
  if (!drills.sequences || drills.sequences.length < 4) {
    errors.push('drills_static.json: expected 4 sequence datasets');
  } else {
    for (const seq of drills.sequences) {
      checkTrilingual(`seq.${seq.id}.title`, seq.title);
      seq.steps.forEach((s, i) => {
        if (s.order !== i + 1) errors.push(`seq.${seq.id}: step order mismatch at ${i}`);
        checkTrilingual(`seq.${seq.id}.step.${s.id}`, s.text);
      });
    }
  }
  if ((drills.washokuItems?.length ?? 0) !== 4) errors.push('drills_static.json: expected 4 washokuItems');
  if ((drills.westernItems?.length ?? 0) !== 4) errors.push('drills_static.json: expected 4 westernItems');
  if ((drills.etiquetteRules?.length ?? 0) < 4) errors.push('drills_static.json: expected >= 4 etiquetteRules');
  if ((drills.ojigiScenarios?.length ?? 0) < 6) errors.push('drills_static.json: expected >= 6 ojigiScenarios');
  if ((drills.keigoItems?.length ?? 0) < 8) errors.push('drills_static.json: expected >= 8 keigoItems');
}

// Check Section 7 invariant coverage across all flashcards + CBT
const corpusText = JSON.stringify({ allCards, cbtQuestions });
const requiredInvariants = [
  '空室',
  '満室',
  '宿泊税',
  '入湯税',
  'ノーショー',
  'パスポート',
  '領収書',
  '1泊2食',
  'OTA',
  'FIT',
  'ADR',
  'RevPAR',
  '会釈',
  '敬礼',
  '最敬礼',
  '尊敬語',
  '謙譲語',
  '丁寧語',
  '一汁三菜',
  '懐石料理',
  'アナフィラキシー',
  'ハラール',
  '119',
  '盲導犬',
  '非常階段',
  '天井に火が移る前',
];

for (const token of requiredInvariants) {
  if (!corpusText.includes(token)) {
    errors.push(`Section 7 invariant missing from curriculum corpus: "${token}"`);
  }
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} errors:\n` + errors.slice(0, 40).join('\n'));
  process.exit(1);
}

console.log(
  `validateData PASS: ${allCards.length} flashcards, ${cbtQuestions.length} CBT questions, 0 broken ruby tags, 0 missing fields, all ${requiredInvariants.length} Section 7 invariants covered.`
);
