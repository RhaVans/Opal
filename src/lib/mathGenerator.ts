export type MathFormulaKind = 'occ' | 'adr' | 'revpar';

export interface MathProblem {
  id: string;
  kind: MathFormulaKind;
  prompt: {
    ja: string;
    id: string;
    en: string;
  };
  unit: string;
  answer: number;
  formulaLabel: string;
  steps: {
    id: string[];
    en: string[];
  };
}

const TOTAL_ROOM_POOL = [40, 50, 80, 100, 120, 150, 200, 250];
const OCC_PERCENT_POOL = [40, 45, 50, 55, 60, 62.5, 65, 70, 72, 75, 80, 84, 85, 90, 95];
const ADR_POOL = [
  8000, 9000, 9500, 10000, 11000, 12000, 12500, 14000, 15000, 16000, 18000, 20000, 22000, 24000,
];

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function formatYen(n: number): string {
  return `¥${n.toLocaleString('en-US')}`;
}

export function generateOccProblem(index: number, rng: () => number = Math.random): MathProblem {
  const validPairs: Array<{ total: number; reserved: number; occ: number }> = [];
  for (const total of TOTAL_ROOM_POOL) {
    for (const occ of OCC_PERCENT_POOL) {
      const scaled = occ * total;
      if (scaled % 100 === 0) {
        validPairs.push({ total, reserved: scaled / 100, occ });
      }
    }
  }
  const chosen = pick(validPairs, rng);
  return {
    id: `math_occ_${index}_${chosen.total}_${chosen.reserved}`,
    kind: 'occ',
    prompt: {
      ja: `総客室数 ${chosen.total} 室のうち、販売（予約）客室数が ${chosen.reserved} 室のとき、稼働率（OCC）は何%ですか。`,
      id: `Dari total ${chosen.total} kamar, ${chosen.reserved} kamar terisi/dipesan. Berapa OCC (%)?`,
      en: `Out of ${chosen.total} total rooms, ${chosen.reserved} rooms are occupied/reserved. What is the OCC (%)?`,
    },
    unit: '%',
    answer: chosen.occ,
    formulaLabel: 'OCC (%) = (Reserved Rooms / Total Rooms) x 100',
    steps: {
      id: [
        `Rumus: OCC (%) = (Kamar Terisi / Total Kamar) x 100`,
        `Hitung: (${chosen.reserved} / ${chosen.total}) x 100 = ${chosen.occ}%`,
      ],
      en: [
        `Formula: OCC (%) = (Reserved Rooms / Total Rooms) x 100`,
        `Compute: (${chosen.reserved} / ${chosen.total}) x 100 = ${chosen.occ}%`,
      ],
    },
  };
}

export function generateAdrProblem(index: number, rng: () => number = Math.random): MathProblem {
  const occupied = pick([30, 40, 45, 50, 60, 75, 80, 90, 100, 120, 150], rng);
  const adr = pick(ADR_POOL, rng);
  const revenue = occupied * adr;
  return {
    id: `math_adr_${index}_${occupied}_${adr}`,
    kind: 'adr',
    prompt: {
      ja: `販売客室数 ${occupied} 室で、客室総売上が ${formatYen(revenue)} のとき、ADR（平均客室単価）は何円ですか。`,
      id: `Dengan ${occupied} kamar terjual dan total pendapatan kamar ${formatYen(revenue)}, berapa ADR (yen)?`,
      en: `With ${occupied} occupied rooms and ${formatYen(revenue)} total room revenue, what is the ADR (yen)?`,
    },
    unit: '¥',
    answer: adr,
    formulaLabel: 'ADR = Total Room Revenue / Occupied Rooms',
    steps: {
      id: [
        `Rumus: ADR = Total Pendapatan Kamar / Kamar Terjual`,
        `Hitung: ${formatYen(revenue)} / ${occupied} = ${formatYen(adr)}`,
      ],
      en: [
        `Formula: ADR = Total Room Revenue / Occupied Rooms`,
        `Compute: ${formatYen(revenue)} / ${occupied} = ${formatYen(adr)}`,
      ],
    },
  };
}

export function generateRevparProblem(
  index: number,
  rng: () => number = Math.random
): MathProblem {
  const cleanPairs: Array<{ occ: number; adr: number; revpar: number }> = [];
  for (const occ of OCC_PERCENT_POOL) {
    for (const adr of ADR_POOL) {
      if ((occ * adr) % 100 === 0) {
        cleanPairs.push({ occ, adr, revpar: (occ * adr) / 100 });
      }
    }
  }
  const chosen = pick(cleanPairs, rng);
  const decimalOcc = Number((chosen.occ / 100).toFixed(3));
  return {
    id: `math_revpar_${index}_${chosen.occ}_${chosen.adr}`,
    kind: 'revpar',
    prompt: {
      ja: `稼働率（OCC）が ${chosen.occ}%、平均客室単価（ADR）が ${formatYen(chosen.adr)} のとき、RevPAR は何円ですか。`,
      id: `Jika OCC adalah ${chosen.occ}% dan ADR adalah ${formatYen(chosen.adr)}, berapa nilai RevPAR (yen)?`,
      en: `If OCC is ${chosen.occ}% and ADR is ${formatYen(chosen.adr)}, what is the RevPAR (yen)?`,
    },
    unit: '¥',
    answer: chosen.revpar,
    formulaLabel: 'RevPAR = OCC x ADR',
    steps: {
      id: [
        `Rumus: RevPAR = OCC x ADR (${chosen.occ}% = ${decimalOcc})`,
        `Hitung: ${decimalOcc} x ${formatYen(chosen.adr)} = ${formatYen(chosen.revpar)}`,
      ],
      en: [
        `Formula: RevPAR = OCC x ADR (${chosen.occ}% = ${decimalOcc})`,
        `Compute: ${decimalOcc} x ${formatYen(chosen.adr)} = ${formatYen(chosen.revpar)}`,
      ],
    },
  };
}

export function generateMathSprint(
  count = 10,
  rng: () => number = Math.random
): MathProblem[] {
  const kinds: MathFormulaKind[] = ['occ', 'adr', 'revpar'];
  const list: MathProblem[] = [];
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    if (kind === 'occ') list.push(generateOccProblem(i + 1, rng));
    else if (kind === 'adr') list.push(generateAdrProblem(i + 1, rng));
    else list.push(generateRevparProblem(i + 1, rng));
  }
  return list;
}

export function parseNumericAnswerInput(input: string): number | null {
  const trimmed = input.trim().replace(/[¥%\s]/g, '');
  if (!trimmed) return null;

  let normalized = trimmed;
  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');

  if (hasComma && hasDot) {
    // Whichever separator appears last acts as decimal separator
    const lastComma = trimmed.lastIndexOf(',');
    const lastDot = trimmed.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = trimmed.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = trimmed.replace(/,/g, '');
    }
  } else if (hasComma) {
    if (/^\d{1,3}(,\d{3})+$/.test(trimmed)) {
      normalized = trimmed.replace(/,/g, '');
    } else if (/^\d+,\d{1,2}$/.test(trimmed)) {
      normalized = trimmed.replace(',', '.');
    } else {
      return null;
    }
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isNumericAnswerMatch(input: string, expected: number): boolean {
  const parsed = parseNumericAnswerInput(input);
  if (parsed === null) return false;
  return Math.abs(parsed - expected) < 0.05;
}
