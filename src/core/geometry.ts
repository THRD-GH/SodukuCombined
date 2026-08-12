/**
 * Per-puzzle geometry. The classic game's rows, columns and boxes are fixed,
 * but every variant here changes exactly that: jigsaw reshapes the boxes, X
 * adds the two diagonals, hyper adds four windows, colour adds nine colour
 * groups. So the units are data built once per puzzle, and everything —
 * solver, generator, board highlighting, clash checks — works off them.
 */

import { CELLS, classicBoxes, colOf, rowOf } from './grid.ts';
import type { Variants } from './types.ts';

export interface Geometry {
  variants: Variants;
  /** Region id 0..8 per cell — classic or jigsaw boxes. */
  boxes: number[];
  /** Colour id 0..8 per cell, when the colour variant is on. */
  colours: number[] | null;
  /** Every all-different unit: 9 rows, 9 cols, 9 boxes, then the extras. */
  units: number[][];
  /** Units each cell belongs to, as indices into `units`. */
  unitsOf: number[][];
  /** Cells sharing at least one unit with cell i. */
  peers: number[][];
  /**
   * Ordered unit pairs that overlap in 2+ cells, for locked candidates: a
   * digit confined to the overlap of `a` cannot appear in the rest of `b`.
   */
  overlaps: { a: number; b: number; shared: number[] }[];
}

/** The four hyper windows: 3x3 boxes at rows/cols 2-4 and 6-8 (1-based). */
export function windowCells(): number[][] {
  const windows: number[][] = [];
  for (const r0 of [1, 5]) {
    for (const c0 of [1, 5]) {
      const cells: number[] = [];
      for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 3; c++) cells.push(r * 9 + c);
      windows.push(cells);
    }
  }
  return windows;
}

/** Main diagonal (R1C1..R9C9), then the anti-diagonal (R1C9..R9C1). */
export function diagonalCells(): number[][] {
  const main: number[] = [];
  const anti: number[] = [];
  for (let i = 0; i < 9; i++) {
    main.push(i * 9 + i);
    anti.push(i * 9 + (8 - i));
  }
  return [main, anti];
}

const groupsFromMap = (map: number[]): number[][] => {
  const groups: number[][] = Array.from({ length: 9 }, () => []);
  for (let i = 0; i < CELLS; i++) groups[map[i]].push(i);
  return groups;
};

export function buildGeometry(
  variants: Variants,
  boxes: number[] = classicBoxes(),
  colours: number[] | null = null,
): Geometry {
  const units: number[][] = [];
  for (let r = 0; r < 9; r++) units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  units.push(...groupsFromMap(boxes));
  if (variants.x) units.push(...diagonalCells());
  if (variants.hyper) units.push(...windowCells());
  if (variants.colour && colours) units.push(...groupsFromMap(colours));

  const unitsOf: number[][] = Array.from({ length: CELLS }, () => []);
  units.forEach((unit, u) => unit.forEach((cell) => unitsOf[cell].push(u)));

  const peers: number[][] = [];
  for (let i = 0; i < CELLS; i++) {
    const seen = new Set<number>();
    for (const u of unitsOf[i]) for (const j of units[u]) if (j !== i) seen.add(j);
    peers.push([...seen]);
  }

  /*
   * Overlap pairs power the generalised locked-candidates rule. Classic
   * pointing/claiming is the box/line case; with variants on, the same
   * reasoning runs between a diagonal and a box, a window and a row, a colour
   * group and anything it meets twice. Membership bitmasks would be faster to
   * build, but this runs once per puzzle over at most 38 units.
   */
  const overlaps: Geometry['overlaps'] = [];
  for (let a = 0; a < units.length; a++) {
    const inA = new Set(units[a]);
    for (let b = 0; b < units.length; b++) {
      if (a === b) continue;
      const shared = units[b].filter((c) => inA.has(c));
      if (shared.length >= 2 && shared.length < units[b].length) {
        overlaps.push({ a, b, shared });
      }
    }
  }

  return { variants, boxes, colours: variants.colour ? colours : null, units, unitsOf, peers, overlaps };
}

/** True when `map` is a valid 9-region map: ids 0..8, nine cells each. */
export function validRegionMap(map: number[] | null | undefined): map is number[] {
  if (!map || map.length !== CELLS) return false;
  const counts = new Array<number>(9).fill(0);
  for (const id of map) {
    if (!Number.isInteger(id) || id < 0 || id > 8) return false;
    counts[id]++;
  }
  return counts.every((n) => n === 9);
}

/** Row/col cell name, for labels: "R4C2". */
export const cellName = (index: number): string => `R${rowOf(index) + 1}C${colOf(index) + 1}`;
