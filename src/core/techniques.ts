import { ALL_DIGITS, CELLS, bit, maskToDigits, popcount } from './grid.ts';
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

/** Naked subsets: n cells in a unit sharing exactly n candidates. */
function nakedSubsets(cand: Candidates, geom: Geometry, sizes: number[]): Outcome {
  let changed: Outcome = 0;
  for (const unit of geom.units) {
    const open = unit.filter((c) => popcount(cand[c]) > 1);
    for (const size of sizes) {
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

/** Hidden subsets: n digits in a unit confined to exactly n cells. */
function hiddenSubsets(cand: Candidates, geom: Geometry, sizes: number[]): Outcome {
  let changed: Outcome = 0;
  const maxSize = Math.max(...sizes);
  for (const unit of geom.units) {
    const spots = new Map<number, number[]>();
    for (let d = 1; d <= 9; d++) {
      const cells = unit.filter((c) => cand[c] & bit(d));
      if (cells.length >= 2 && cells.length <= maxSize) spots.set(d, cells);
    }
    const digits = [...spots.keys()];

    for (const size of sizes) {
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

/**
 * Fish of size n on rows and columns: X-wing (2), swordfish (3), jellyfish
 * (4). If every place a digit can go in n base lines falls within the same n
 * cover lines, the digit leaves the rest of those cover lines. Rows and
 * columns only — the classic definition — which every variant board has.
 */
function fish(cand: Candidates, n: number): Outcome {
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

      // Base lines holding the digit in 2..n places.
      const bases: number[] = [];
      for (let i = 0; i < 9; i++) {
        if (lines[i].length >= 2 && lines[i].length <= n) bases.push(i);
      }
      if (bases.length < n) continue;

      const pick = (start: number, chosen: number[], cover: Set<number>): boolean => {
        if (cover.size > n) return true;
        if (chosen.length === n) {
          if (cover.size !== n) return true;
          for (const j of cover) {
            for (let i = 0; i < 9; i++) {
              if (chosen.includes(i)) continue;
              const cell = byRow ? i * 9 + j : j * 9 + i;
              const r = eliminate(cand, cell, b);
              if (r === -1) return false;
              if (r === 1) changed = 1;
            }
          }
          return true;
        }
        for (let k = start; k < bases.length; k++) {
          const line = bases[k];
          const merged = new Set([...cover, ...lines[line]]);
          if (merged.size > n) continue;
          if (!pick(k + 1, [...chosen, line], merged)) return false;
        }
        return true;
      };
      if (!pick(0, [], new Set())) return false;
    }
    return true;
  };

  if (!scan(true) || !scan(false)) return -1;
  return changed;
}

/** Peer lookup sets, built once per technique pass. */
const peerSets = (geom: Geometry): Set<number>[] => geom.peers.map((p) => new Set(p));

/** Cells holding exactly two candidates. */
const bivalues = (cand: Candidates): number[] => {
  const out: number[] = [];
  for (let i = 0; i < CELLS; i++) if (popcount(cand[i]) === 2) out.push(i);
  return out;
};

/**
 * XY-wing. A pivot {a,b} with one pincer {a,c} and another {b,c} among its
 * peers: whichever way the pivot falls, some pincer is c — so c leaves every
 * cell that sees both pincers. Peers come off the geometry, so the pattern
 * bends around variant units by itself.
 */
function xyWing(cand: Candidates, geom: Geometry): Outcome {
  let changed: Outcome = 0;
  const peers = peerSets(geom);
  const pool = bivalues(cand);

  for (const pivot of pool) {
    const pm = cand[pivot];
    const mates = pool.filter((q) => q !== pivot && peers[pivot].has(q));
    for (let qi = 0; qi < mates.length; qi++) {
      const q = mates[qi];
      const qShare = cand[q] & pm;
      if (popcount(qShare) !== 1) continue;
      for (let ri = qi + 1; ri < mates.length; ri++) {
        const r = mates[ri];
        const rShare = cand[r] & pm;
        if (popcount(rShare) !== 1 || rShare === qShare) continue;
        // The pincers must agree on the digit outside the pivot.
        const c = cand[q] & cand[r] & ~pm;
        if (popcount(c) !== 1) continue;
        for (let cell = 0; cell < CELLS; cell++) {
          if (cell === pivot || cell === q || cell === r) continue;
          if (!peers[q].has(cell) || !peers[r].has(cell)) continue;
          const res = eliminate(cand, cell, c);
          if (res === -1) return -1;
          if (res === 1) changed = 1;
        }
      }
    }
  }
  return changed;
}

/**
 * XYZ-wing: the pivot holds all three digits {a,b,c}, the pincers {a,c} and
 * {b,c}. Every way the three cells resolve puts c in one of them, so c
 * leaves the cells that see all three.
 */
function xyzWing(cand: Candidates, geom: Geometry): Outcome {
  let changed: Outcome = 0;
  const peers = peerSets(geom);
  const pool = bivalues(cand);

  for (let pivot = 0; pivot < CELLS; pivot++) {
    if (popcount(cand[pivot]) !== 3) continue;
    const pm = cand[pivot];
    const mates = pool.filter((q) => peers[pivot].has(q) && (cand[q] & ~pm) === 0);
    for (let qi = 0; qi < mates.length; qi++) {
      for (let ri = qi + 1; ri < mates.length; ri++) {
        const q = mates[qi];
        const r = mates[ri];
        const c = cand[q] & cand[r];
        if (popcount(c) !== 1) continue;
        for (let cell = 0; cell < CELLS; cell++) {
          if (cell === pivot || cell === q || cell === r) continue;
          if (!peers[pivot].has(cell) || !peers[q].has(cell) || !peers[r].has(cell)) continue;
          const res = eliminate(cand, cell, c);
          if (res === -1) return -1;
          if (res === 1) changed = 1;
        }
      }
    }
  }
  return changed;
}

/**
 * W-wing: two cells with the same two candidates {a,b}, joined through a
 * unit where b has only two places, one seeing each cell. If either end were
 * b, fine; if neither, both places of that unit's b would be gone — so one
 * end is always b or the link forces it, and a leaves every cell seeing both
 * ends. Both digit directions are tried.
 */
function wWing(cand: Candidates, geom: Geometry): Outcome {
  let changed: Outcome = 0;
  const peers = peerSets(geom);
  const pool = bivalues(cand);

  // Strong links per digit: units where the digit has exactly two spots.
  const strong: [number, number][][] = Array.from({ length: 10 }, () => []);
  for (const unit of geom.units) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      const spots = unit.filter((c) => cand[c] & b);
      if (spots.length === 2) strong[d].push([spots[0], spots[1]]);
    }
  }

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const c1 = pool[i];
      const c2 = pool[j];
      if (cand[c1] !== cand[c2] || peers[c1].has(c2)) continue;
      const digits = maskToDigits(cand[c1]);
      for (const linkDigit of digits) {
        // The link carries one digit; the elimination is the other one.
        const other = cand[c1] & ~bit(linkDigit);
        for (const [w1, w2] of strong[linkDigit]) {
          if (w1 === c1 || w1 === c2 || w2 === c1 || w2 === c2) continue;
          const joins =
            (peers[c1].has(w1) && peers[c2].has(w2)) || (peers[c1].has(w2) && peers[c2].has(w1));
          if (!joins) continue;
          for (let cell = 0; cell < CELLS; cell++) {
            if (cell === c1 || cell === c2) continue;
            if (!peers[c1].has(cell) || !peers[c2].has(cell)) continue;
            const res = eliminate(cand, cell, other);
            if (res === -1) return -1;
            if (res === 1) changed = 1;
          }
        }
      }
    }
  }
  return changed;
}

/**
 * The turbot fish family — skyscraper, two-string kite, turbot proper. Two
 * strong links on one digit (units where it has exactly two places), joined
 * by a weak link (the joining ends see each other): then one of the far ends
 * is that digit, and it leaves every cell seeing both far ends. Strong links
 * come from *any* unit, so the pattern works across variant geometry too.
 */
function turbotFish(cand: Candidates, geom: Geometry): Outcome {
  let changed: Outcome = 0;
  const peers = peerSets(geom);

  for (let d = 1; d <= 9; d++) {
    const b = bit(d);
    const links: [number, number][] = [];
    for (const unit of geom.units) {
      const spots = unit.filter((c) => cand[c] & b);
      if (spots.length === 2) links.push([spots[0], spots[1]]);
    }

    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        const [a1, a2] = links[i];
        const [b1, b2] = links[j];
        // All four cells distinct, else this is a chain, not a turbot.
        if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) continue;

        // Try every pairing of joining ends and far ends.
        const shapes: [number, number, number, number][] = [
          [a1, a2, b1, b2],
          [a1, a2, b2, b1],
          [a2, a1, b1, b2],
          [a2, a1, b2, b1],
        ];
        for (const [far1, join1, join2, far2] of shapes) {
          if (!peers[join1].has(join2)) continue;
          for (let cell = 0; cell < CELLS; cell++) {
            if (cell === far1 || cell === far2 || cell === join1 || cell === join2) continue;
            if (!peers[far1].has(cell) || !peers[far2].has(cell)) continue;
            const res = eliminate(cand, cell, b);
            if (res === -1) return -1;
            if (res === 1) changed = 1;
          }
        }
      }
    }
  }
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
  { name: 'naked subset', difficulty: 3, run: (c, g) => nakedSubsets(c, g, [2, 3]) },
  { name: 'hidden subset', difficulty: 3, run: (c, g) => hiddenSubsets(c, g, [2, 3]) },
  { name: 'naked quad', difficulty: 4, run: (c, g) => nakedSubsets(c, g, [4]) },
  { name: 'hidden quad', difficulty: 4, run: (c, g) => hiddenSubsets(c, g, [4]) },
  { name: 'x-wing', difficulty: 4, run: (c) => fish(c, 2) },
  { name: 'xy-wing', difficulty: 5, run: xyWing },
  { name: 'xyz-wing', difficulty: 5, run: xyzWing },
  { name: 'swordfish', difficulty: 5, run: (c) => fish(c, 3) },
  { name: 'turbot fish', difficulty: 6, run: turbotFish },
  { name: 'w-wing', difficulty: 6, run: wWing },
  { name: 'jellyfish', difficulty: 6, run: (c) => fish(c, 4) },
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
