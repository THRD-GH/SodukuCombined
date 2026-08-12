/** Static facts about a 9x9 sudoku grid. Variant geometry lives in geometry.ts. */

export const SIZE = 9;
export const CELLS = 81;
export const ALL_DIGITS = 0b111111111; // bit 0 => digit 1 ... bit 8 => digit 9

export const bit = (digit: number): number => 1 << (digit - 1);

/** Digits (1..9) present in a bitmask. */
export function maskToDigits(mask: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & bit(d)) out.push(d);
  return out;
}

export function popcount(mask: number): number {
  let n = 0;
  while (mask) {
    mask &= mask - 1;
    n++;
  }
  return n;
}

/** Lowest set digit in a mask, or 0. Only meaningful when popcount === 1. */
export function maskToDigit(mask: number): number {
  return mask === 0 ? 0 : 32 - Math.clz32(mask & -mask);
}

export const rowOf = (i: number): number => (i / 9) | 0;
export const colOf = (i: number): number => i % 9;

/** Region id per cell for the classic 3x3 boxes — the default `boxes` map. */
export function classicBoxes(): number[] {
  return Array.from(
    { length: CELLS },
    (_, i) => ((rowOf(i) / 3) | 0) * 3 + ((colOf(i) / 3) | 0),
  );
}

/** Orthogonally adjacent cells — used when carving jigsaw regions. */
export const NEIGHBOURS: number[][] = (() => {
  const nb: number[][] = Array.from({ length: CELLS }, () => []);
  for (let i = 0; i < CELLS; i++) {
    const r = rowOf(i);
    const c = colOf(i);
    if (r > 0) nb[i].push(i - 9);
    if (r < 8) nb[i].push(i + 9);
    if (c > 0) nb[i].push(i - 1);
    if (c < 8) nb[i].push(i + 1);
  }
  return nb;
})();
