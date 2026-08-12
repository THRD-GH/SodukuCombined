/** Difficulty is a 1..6 star level, as in the killer game's ladder. */
export type Level = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Which extra rules are in play. Any combination is legal: the constraint
 * system composes freely, so X + Jigsaw + Hyper + Colour is one (savage)
 * puzzle rather than four modes.
 */
export interface Variants {
  /** Both main diagonals hold 1..9. */
  x: boolean;
  /** The percent sign: the anti-diagonal and two windows hold 1..9. */
  percent: boolean;
  /** Irregular nine-cell regions replace the 3x3 boxes. */
  jigsaw: boolean;
  /** Four extra 3x3 boxes (windows) at rows/cols 2-4 and 6-8. */
  hyper: boolean;
  /** Nine colour groups, each holding 1..9. */
  colour: boolean;
}

export const NO_VARIANTS: Variants = {
  x: false,
  percent: false,
  jigsaw: false,
  hyper: false,
  colour: false,
};

/** Canonical letter order, so every combo has exactly one code. */
const VARIANT_LETTERS: [keyof Variants, string][] = [
  ['x', 'X'],
  ['percent', 'P'],
  ['jigsaw', 'J'],
  ['hyper', 'H'],
  ['colour', 'C'],
];

/** "S" plain, else the letters of the active variants: "X", "JH", "XJHC"... */
export function variantCode(v: Variants): string {
  const code = VARIANT_LETTERS.filter(([key]) => v[key])
    .map(([, letter]) => letter)
    .join('');
  return code === '' ? 'S' : code;
}

export function parseVariantCode(code: string): Variants | null {
  if (code === 'S') return { ...NO_VARIANTS };
  if (!/^X?P?J?H?C?$/.test(code) || code === '') return null;
  return {
    x: code.includes('X'),
    percent: code.includes('P'),
    jigsaw: code.includes('J'),
    hyper: code.includes('H'),
    colour: code.includes('C'),
  };
}

export const VARIANT_NAMES: Record<keyof Variants, string> = {
  x: 'X',
  percent: 'Percent',
  jigsaw: 'Jigsaw',
  hyper: 'Hyper',
  colour: 'Colour',
};

/** "Sudoku", "X Sudoku", "X · Jigsaw Sudoku"... for titles and labels. */
export function variantLabel(v: Variants): string {
  const names = VARIANT_LETTERS.filter(([key]) => v[key]).map(([key]) => VARIANT_NAMES[key]);
  return names.length === 0 ? 'Sudoku' : `${names.join(' · ')} Sudoku`;
}

export interface Puzzle {
  variants: Variants;
  /** Region id 0..8 per cell — the boxes, classic or jigsaw-shaped. */
  boxes: number[];
  /** Colour id 0..8 per cell when the colour variant is on, else null. */
  colours: number[] | null;
  /** 81 digits, 0 for an empty cell — what the puzzle starts with. */
  givens: number[];
  /** 81 digits, 1..9 — the unique solution. */
  solution: number[];
  /** Level this puzzle was generated for. */
  difficulty: Level;
  seed: number;
  /** Difficulty score the generator measured; the rating metric. */
  rating: number;
}

/** Stable puzzle identifier, displayed as "S3-10" or "XJ4-2". */
export interface PuzzleId {
  variants: Variants;
  level: Level;
  number: number;
}

export const formatPuzzleId = (id: PuzzleId): string =>
  `${variantCode(id.variants)}${id.level}-${id.number}`;

/** The inverse of formatPuzzleId: "S3-10", "XC4-2"... */
export function parsePuzzleId(key: string): PuzzleId | null {
  const match = /^([A-Z]+)([1-6])-(\d+)$/.exec(key);
  if (!match) return null;
  const variants = parseVariantCode(match[1]);
  if (variants === null) return null;
  return { variants, level: Number(match[2]) as Level, number: Number(match[3]) };
}
