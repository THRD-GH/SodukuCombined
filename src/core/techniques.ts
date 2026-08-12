import { ALL_DIGITS, CELLS, bit, popcount } from './grid.ts';
import type { Geometry } from './geometry.ts';

export type Candidates = Uint16Array;

export function initialCandidates(): Candidates {
  return new Uint16Array(CELLS).fill(ALL_DIGITS);
}

/** Candidates with the givens already pinned. */
export function candidatesFromGivens(givens: number[]): Candidates {
  const cand = initialCandidates();
  for (let i = 0; i < CELLS; i++) if (givens[i] !== 0) cand[i] = bit(givens[i]);
  return cand;
}

// ---------------------------------------------------------------- primitives

const eliminate = (cand: Candidates, cell: number, mask: number): number => {
  const next = cand[cell] & ~mask;
  if (next === cand[cell]) return 0;
  if (next === 0) return -1;
  cand[cell] = next;
  return 1;
};

const restrict = (cand: Candidates, cell: number, mask: number): number => {
  const next = cand[cell] & mask;
  if (next === cand[cell]) return 0;
  if (next === 0) return -1;
  cand[cell] = next;
  return 1;
};

/** Result of one technique pass: -1 contradiction, 0 nothing, 1 progress. */
type Outcome = -1 | 0 | 1;

function nakedSingles(cand: Candidates, geom: Geometry): Outcome {
  let changed: Outcome = 0;
  for (let i = 0; i < CELLS; i++) {
    const m = cand[i];
    if (m === 0) return -1;
    if (popcount(m) !== 1) continue;
    for (const p of geom.peers[i]) {
      const r = eliminate(cand, p, m);
      if (r === -1) return -1;
      if (r === 1) changed = 1;
    }
  }
  return changed;
}

function hiddenSingles(cand: Candidates, geom: Geometry): Outcome {
  let changed: Outcome = 0;
  for (const unit of geom.units) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      let count = 0;
      let where = -1;
      for (const c of unit) {
        if (cand[c] & b) {
          count++;
          where = c;
        }
      }
      if (count === 0) return -1;
      if (count === 1 && cand[where] !== b) {
        cand[where] = b;
        changed = 1;
      }
    }
  }
  return changed;
}

/**
 * Locked candidates, generalised. Classic pointing/claiming is the box/line
 * case; the same reasoning holds for any two overlapping units. If every
 * place a digit can still go in unit A lies inside A∩B, the digit is
 * certainly in that overlap — so it leaves the rest of B. With variants on,
 * this fires between diagonals and boxes, windows and rows, colour groups and
 * whatever they cross, all from one rule.
 */
function lockedCandidates(cand: Candidates, geom: Geometry): Outcome {
  let changed: Outcome = 0;
  for (const { a, b, shared } of geom.overlaps) {
    for (let d = 1; d <= 9; d++) {
      const bMask = bit(d);
      let inShared = 0;
      let elsewhereInA = false;
      for (const c of geom.units[a]) {
        if (!(cand[c] & bMask)) continue;
        if (shared.includes(c)) inShared++;
        else {
          elsewhereInA = true;
          break;
        }
      }
      if (elsewhereInA || inShared < 2) continue;
      const inside = new Set(shared);
      for (const c of geom.units[b]) {
        if (inside.has(c)) continue;
        const r = eliminate(cand, c, bMask);
        if (r === -1) return -1;
        if (r === 1) changed = 1;
      }
    }
  }
  return changed;
}

/** Naked pairs and triples: n cells in a unit sharing exactly n candidates. */
function nakedSubsets(cand: Candidates, geom: Geometry): Outcome {
  let changed: Outcome = 0;
  for (const unit of geom.units) {
    const open = unit.filter((c) => popcount(cand[c]) > 1);
    for (let size = 2; size <= 3; size++) {
      const pool = open.filter((c) => popcount(cand[c]) <= size);
      const n = pool.length;
      if (n <= size) continue;

      const walk = (start: number, picked: number[], mask: number): boolean => {
        if (picked.length === size) {
          if (popcount(mask) !== size) return true;
          const inside = new Set(picked);
          for (const c of unit) {
            if (inside.has(c)) continue;
            const r = eliminate(cand, c, mask);
            if (r === -1) return false;
            if (r === 1) changed = 1;
          }
          return true;
        }
        for (let i = start; i < n; i++) {
          const next = mask | cand[pool[i]];
          if (popcount(next) > size) continue;
          if (!walk(i + 1, [...picked, pool[i]], next)) return false;
        }
        return true;
      };
      if (!walk(0, [], 0)) return -1;
    }
  }
  return changed;
}

/** Hidden pairs and triples: n digits in a unit confined to exactly n cells. */
function hiddenSubsets(cand: Candidates, geom: Geometry): Outcome {
  let changed: Outcome = 0;
  for (const unit of geom.units) {
    const spots = new Map<number, number[]>();
    for (let d = 1; d <= 9; d++) {
      const cells = unit.filter((c) => cand[c] & bit(d));
      if (cells.length >= 2 && cells.length <= 3) spots.set(d, cells);
    }
    const digits = [...spots.keys()];

    for (let size = 2; size <= 3; size++) {
      const walk = (start: number, picked: number[], cells: Set<number>): boolean => {
        if (picked.length === size) {
          if (cells.size !== size) return true;
          const mask = picked.reduce((m, d) => m | bit(d), 0);
          for (const c of cells) {
            const r = restrict(cand, c, mask);
            if (r === -1) return false;
            if (r === 1) changed = 1;
          }
          return true;
        }
        for (let i = start; i < digits.length; i++) {
          const merged = new Set([...cells, ...spots.get(digits[i])!]);
          if (merged.size > size) continue;
          if (!walk(i + 1, [...picked, digits[i]], merged)) return false;
        }
        return true;
      };
      if (!walk(0, [], new Set())) return -1;
    }
  }
  return changed;
}

/** X-Wing: a digit locked to the same two lines in two crossing lines. */
function xWing(cand: Candidates): Outcome {
  let changed: Outcome = 0;

  const scan = (byRow: boolean): boolean => {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      const lines: number[][] = [];
      for (let i = 0; i < 9; i++) {
        const cells: number[] = [];
        for (let j = 0; j < 9; j++) {
          const cell = byRow ? i * 9 + j : j * 9 + i;
          if (cand[cell] & b) cells.push(j);
        }
        lines.push(cells);
      }
      for (let a = 0; a < 9; a++) {
        if (lines[a].length !== 2) continue;
        for (let c = a + 1; c < 9; c++) {
          if (lines[c].length !== 2) continue;
          if (lines[a][0] !== lines[c][0] || lines[a][1] !== lines[c][1]) continue;
          for (const j of lines[a]) {
            for (let i = 0; i < 9; i++) {
              if (i === a || i === c) continue;
              const cell = byRow ? i * 9 + j : j * 9 + i;
              const r = eliminate(cand, cell, b);
              if (r === -1) return false;
              if (r === 1) changed = 1;
            }
          }
        }
      }
    }
    return true;
  };

  if (!scan(true) || !scan(false)) return -1;
  return changed;
}

// ----------------------------------------------------------------- the stack

export interface Technique {
  name: string;
  /** Roughly how hard a person finds it, 1 easiest. */
  difficulty: number;
  run(cand: Candidates, geom: Geometry): Outcome;
}

/**
 * Ordered easiest first. The solver always applies the cheapest technique that
 * fires, so a puzzle's rating is the hardest rung it was ever forced onto.
 */
export const TECHNIQUES: Technique[] = [
  { name: 'naked single', difficulty: 1, run: nakedSingles },
  { name: 'hidden single', difficulty: 1, run: hiddenSingles },
  { name: 'locked candidates', difficulty: 2, run: lockedCandidates },
  { name: 'naked subset', difficulty: 3, run: nakedSubsets },
  { name: 'hidden subset', difficulty: 3, run: hiddenSubsets },
  { name: 'x-wing', difficulty: 4, run: (c) => xWing(c) },
];

export const MAX_DIFFICULTY = Math.max(...TECHNIQUES.map((t) => t.difficulty));

export interface Step {
  /** Which technique moved things on. */
  technique: string;
  difficulty: number;
  /** Cells it changed, for pointing at them on the board. */
  cells: number[];
  /** A cell it answered outright, if any. */
  solved: { cell: number; digit: number } | null;
}

/**
 * The next thing a solver would do from this position, using the easiest
 * technique that still achieves something. Returns null when the grid is
 * finished, contradictory, or beyond the technique stack.
 *
 * Unlike the killer game this used to be, naked singles are a real,
 * reportable step here rather than silent bookkeeping — an easy grid solves
 * entirely on that cascade, and a hint engine that swallows it would tell
 * the player there is nothing to do on a half-empty board.
 */
export function nextStep(cand: Candidates, geom: Geometry): Step | null {
  for (const technique of TECHNIQUES) {
    const before = Uint16Array.from(cand);
    const outcome = technique.run(cand, geom);
    if (outcome === -1) return null;
    if (outcome === 0) continue;

    const cells: number[] = [];
    let solved: Step['solved'] = null;
    for (let i = 0; i < CELLS; i++) {
      if (cand[i] === before[i]) continue;
      cells.push(i);
      if (solved === null && popcount(cand[i]) === 1 && popcount(before[i]) > 1) {
        solved = { cell: i, digit: 32 - Math.clz32(cand[i]) };
      }
    }
    return { technique: technique.name, difficulty: technique.difficulty, cells, solved };
  }
  return null;
}

export interface LogicTrace {
  /** Hardest technique the solve was forced onto. 0 if nothing was needed. */
  hardest: number;
  /** How many times each technique fired. */
  used: Map<string, number>;
}

/**
 * Applies techniques to a fixed point, always reaching for the easiest one
 * that still does something. Returns false only on a contradiction.
 */
export function propagate(
  cand: Candidates,
  geom: Geometry,
  maxDifficulty = MAX_DIFFICULTY,
  trace?: LogicTrace,
): boolean {
  for (;;) {
    let progressed = false;
    for (const technique of TECHNIQUES) {
      if (technique.difficulty > maxDifficulty) break;
      const outcome = technique.run(cand, geom);
      if (outcome === -1) return false;
      if (outcome === 0) continue;
      if (trace) {
        trace.hardest = Math.max(trace.hardest, technique.difficulty);
        trace.used.set(technique.name, (trace.used.get(technique.name) ?? 0) + 1);
      }
      progressed = true;
      break; // restart from the easiest technique
    }
    if (!progressed) return true;
  }
}
