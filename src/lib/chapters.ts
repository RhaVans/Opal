import type { ChapterId, LangPreset } from './types';

export interface ChapterMeta {
  id: ChapterId;
  code: string;
  pageRange: string;
  jaRuby: string;
  jaPlain: string;
  idTitle: string;
  enTitle: string;
  toneBg: string;
  toneText: string;
  toneBody: string;
  isDarkSurface: boolean;
}

export const CHAPTER_META: ChapterMeta[] = [
  {
    id: 1,
    code: 'CH 01',
    pageRange: 'p.5-21',
    jaRuby: 'フロントで<ruby>行<rt>おこな</rt></ruby>う<ruby>主<rt>おも</rt></ruby>な<ruby>業務<rt>ぎょうむ</rt></ruby>',
    jaPlain: 'フロントで行う主な業務',
    idTitle: 'Tugas Utama Front Desk',
    enTitle: 'Main Duties at Front Desk',
    toneBg: '#E1DAFB',
    toneText: '#4D3EA3',
    toneBody: '#1D1D1F',
    isDarkSurface: false,
  },
  {
    id: 2,
    code: 'CH 02',
    pageRange: 'p.23-35',
    jaRuby: '<ruby>企画<rt>きかく</rt></ruby>・<ruby>広報<rt>こうほう</rt></ruby>',
    jaPlain: '企画・広報',
    idTitle: 'Perencanaan & PR',
    enTitle: 'Planning & Public Relations',
    toneBg: '#FFD2F4',
    toneText: '#450C3F',
    toneBody: '#1D1D1F',
    isDarkSurface: false,
  },
  {
    id: 3,
    code: 'CH 03',
    pageRange: 'p.37-50',
    jaRuby: '<ruby>接客<rt>せっきゃく</rt></ruby>',
    jaPlain: '接客',
    idTitle: 'Pelayanan Tamu',
    enTitle: 'Customer Service',
    toneBg: '#758AD1',
    toneText: '#1D1D1F',
    toneBody: '#1D1D1F',
    isDarkSurface: false,
  },
  {
    id: 4,
    code: 'CH 04',
    pageRange: 'p.52-66',
    jaRuby: 'レストランサービス',
    jaPlain: 'レストランサービス',
    idTitle: 'Layanan Restoran',
    enTitle: 'Restaurant Service',
    toneBg: '#4D3EA3',
    toneText: '#FFD2F4',
    toneBody: '#FFFFFF',
    isDarkSurface: true,
  },
  {
    id: 5,
    code: 'CH 05',
    pageRange: 'p.68-75',
    jaRuby: '<ruby>安全<rt>あんぜん</rt></ruby><ruby>衛生<rt>えいせい</rt></ruby><ruby>管理<rt>かんり</rt></ruby>',
    jaPlain: '安全衛生管理・その他基礎知識',
    idTitle: 'Keselamatan & Higienitas',
    enTitle: 'Safety, Health & Basics',
    toneBg: '#450C3F',
    toneText: '#FFD2F4',
    toneBody: '#E1DAFB',
    isDarkSurface: true,
  },
];

export function getGreetingForPreset(
  preset: LangPreset,
  now: Date = new Date()
): { line1: string; line2: string } {
  const hour = now.getHours();
  if (preset === 'jp_id') {
    if (hour < 11) return { line1: 'Selamat pagi,', line2: 'Concierge' };
    if (hour < 17) return { line1: 'Selamat siang,', line2: 'Concierge' };
    return { line1: 'Selamat malam,', line2: 'Concierge' };
  }
  if (preset === 'jp_en') {
    if (hour < 11) return { line1: 'Good morning,', line2: 'Concierge' };
    if (hour < 17) return { line1: 'Good afternoon,', line2: 'Concierge' };
    return { line1: 'Good evening,', line2: 'Concierge' };
  }
  if (preset === 'jp_only') {
    if (hour < 11) return { line1: 'おはようございます', line2: 'コンシェルジュ' };
    if (hour < 17) return { line1: 'こんにちは', line2: 'コンシェルジュ' };
    return { line1: 'こんばんは', line2: 'コンシェルジュ' };
  }
  // jp_id_en
  if (hour < 11) return { line1: 'Selamat pagi,', line2: 'Concierge' };
  if (hour < 17) return { line1: 'Selamat siang,', line2: 'Concierge' };
  return { line1: 'Selamat malam,', line2: 'Concierge' };
}

export function getChapterMeta(id: ChapterId): ChapterMeta {
  return CHAPTER_META.find((c) => c.id === id) ?? CHAPTER_META[0];
}
