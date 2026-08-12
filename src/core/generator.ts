import { CELLS, NEIGHBOURS, bit, classicBoxes, colOf, maskToDigits, popcount, rowOf } from './grid.ts';
import { buildGeometry } from './geometry.ts';
import type { Geometry } from './geometry.ts';
import { mulberry32, shuffle } from './rng.ts';
import { candidatesToGrid, classify, isUnique, solve } from './solver.ts';
import type { Classification } from './solver.ts';
import { candidatesFromGivens, initialCandidates, propagate } from './techniques.ts';
import type { Candidates } from './techniques.ts';
import type { Level, Puzzle, Variants } from './types.ts';
import { variantCode } from './types.ts';

/** Six levels, one to six stars. */
export const LEVELS: Level[] = [1, 2, 3, 4, 5, 6];

export const LEVEL_NAMES: Record<Level, string> = {
  1: 'Gentle',
  2: 'Easy',
  3: 'Steady',
  4: 'Tricky',
  5: 'Tough',
  6: 'Brutal',
};

/**
 * Collapses a classification into a 0..5 rung, so level N wants score N-1.
 * A puzzle is as hard as the hardest technique it forces; once logic runs out
 * altogether, how much trial and error is left takes over.
 */
export function difficultyScore(c: Classification): number {
  if (!c.logical) return c.guesses <= 4 ? 4 : 5;
  if (c.hardest <= 1) return 0;
  if (c.hardest === 2) return 1;
  if (c.hardest === 3) return 2;
  return 3;
}

/**
 * How solvable the puzzle must stay while clues are removed. Levels 1..4 are
 * finishable by techniques alone, capped at the level's rung; 5 and 6 are
 * allowed past the stack into trial and error.
 */
const LEVEL_TECHNIQUE_CAP: Record<Level, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 0, 6: 0 };

/**
 * How far the dig goes, per level. Easy levels stop while the board is still
 * comfortably populated — a Gentle grid with 22 givens rates as easy but
 * looks like a cliff face — while the top levels dig to the practical floor,
 * which is where forced guessing lives.
 */
const GIVENS_TARGET: Record<Level, number> = { 1: 38, 2: 31, 3: 25, 4: 23, 5: 22, 6: 20 };

// ------------------------------------------------------------------- layouts

/**
 * Carve the grid into nine connected nine-cell regions with 180° rotational
 * symmetry: region 8-k is region k spun round, and the centre region is its
 * own mirror. Symmetry is not just cosmetic — with the X or hyper variants
 * stacked on top, random asymmetric carves measured out at 0/30 admitting a
 * solution, while symmetric ones manage roughly 1 in 3 to 1 in 10 on the
 * worst combination, which retries then absorb.
 *
 * Four regions are grown cell by cell, their mirrors filled in lockstep;
 * whatever remains is the centre region, symmetric by construction, and only
 * has to prove itself connected. Dead ends just start the attempt over.
 */
export function carveJigsaw(rnd: () => number): number[] | null {
  outer: for (let attempt = 0; attempt < 120; attempt++) {
    const owner = new Array<number>(CELLS).fill(-1);
    owner[40] = 4;

    for (let region = 0; region < 4; region++) {
      const seed = owner.indexOf(-1);
      if (seed === -1 || 80 - seed === seed) continue outer;
      owner[seed] = region;
      owner[80 - seed] = 8 - region;
      const cells = [seed];

      while (cells.length < 9) {
        const frontier: number[] = [];
        for (const c of cells) {
          for (const nb of NEIGHBOURS[c]) {
            if (owner[nb] !== -1 || frontier.includes(nb)) continue;
            // The mirror must be free too, and not fold onto this region.
            if (owner[80 - nb] !== -1 || nb === 80 - nb) continue;
            if (cells.includes(80 - nb)) continue;
            frontier.push(nb);
          }
        }
        if (frontier.length === 0) continue outer;
        const pick = frontier[Math.floor(rnd() * frontier.length)];
        owner[pick] = region;
        owner[80 - pick] = 8 - region;
        cells.push(pick);
      }
    }

    const rest: number[] = [];
    for (let i = 0; i < CELLS; i++) if (owner[i] === -1) rest.push(i);
    if (rest.length !== 8) continue;
    for (const c of rest) owner[c] = 4;

    const seen = new Set<number>([40]);
    const stack = [40];
    while (stack.length > 0) {
      const c = stack.pop()!;
      for (const nb of NEIGHBOURS[c]) {
        if (owner[nb] === 4 && !seen.has(nb)) {
          seen.add(nb);
          stack.push(nb);
        }
      }
    }
    if (seen.size !== 9) continue;
    return owner;
  }
  return null;
}

/**
 * Colour classes derived from the solution, not searched for. Asking for a
 * pre-made layout that some solution then satisfies is asking for orthogonal
 * sudoku grids, and measurement says random grids essentially never have an
 * orthogonal mate — the search burned 500k nodes and found nothing, ten
 * layouts out of ten. Built this way round it cannot fail: each digit's nine
 * cells are dealt out one to each class, so every class holds nine distinct
 * digits in the solution by construction.
 *
 * The dealing is greedy: each cell goes to the free class where it crowds
 * its classmates least (same row, column or box), so classes come out
 * scattered rather than clumped. Class ids are then relabelled by first
 * appearance, purely so equal seeds yield identical-looking boards.
 */
export function colourClasses(
  solution: number[],
  boxes: number[],
  rnd: () => number,
): number[] {
  const colours = new Array<number>(CELLS).fill(-1);
  // Per class: cells assigned so far, for the crowding score.
  const members: number[][] = Array.from({ length: 9 }, () => []);

  const crowding = (cell: number, cls: number): number => {
    let score = 0;
    for (const m of members[cls]) {
      if (rowOf(m) === rowOf(cell)) score += 2;
      if (colOf(m) === colOf(cell)) score += 2;
      if (boxes[m] === boxes[cell]) score += 1;
    }
    return score;
  };

  for (let d = 1; d <= 9; d++) {
    const cells = shuffle(
      Array.from({ length: CELLS }, (_, i) => i).filter((i) => solution[i] === d),
      rnd,
    );
    const free = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    for (const cell of cells) {
      let best = -1;
      let bestScore = Infinity;
      for (const cls of free) {
        const score = crowding(cell, cls);
        if (score < bestScore) {
          bestScore = score;
          best = cls;
        }
      }
      free.delete(best);
      colours[cell] = best;
      members[best].push(cell);
    }
  }

  // Stable relabel: class ids in order of first appearance on the board.
  const relabel = new Map<number, number>();
  for (const c of colours) if (!relabel.has(c)) relabel.set(c, relabel.size);
  return colours.map((c) => relabel.get(c)!);
}

// ------------------------------------------------------------------ solution

/**
 * A solved grid respecting every unit. Cell-by-cell backtracking is fine on
 * a nearly-classic geometry but drowns once jigsaw, X and hyper stack up —
 * a wrong early digit is not contradicted for rows. So: singles propagation
 * after every placement, most-constrained cell first, digit order shuffled.
 * Aborts fast on a barren layout (they exist — not every jigsaw carve admits
 * an X + hyper solution), and the caller retries with a fresh layout.
 */
export function randomSolution(geom: Geometry, rnd: () => number, nodeLimit = 20000): number[] | null {
  let nodes = 0;

  const search = (cand: Candidates): number[] | null => {
    if (++nodes > nodeLimit) return null;
    if (!propagate(cand, geom, 1)) return null;

    let best = -1;
    let bestCount = 10;
    for (let i = 0; i < CELLS; i++) {
      const pc = popcount(cand[i]);
      if (pc > 1 && pc < bestCount) {
        bestCount = pc;
        best = i;
        if (pc === 2) break;
      }
    }
    if (best === -1) return candidatesToGrid(cand);

    for (const d of shuffle(maskToDigits(cand[best]), rnd)) {
      const next = Uint16Array.from(cand);
      next[best] = bit(d);
      const found = search(next);
      if (found !== null) return found;
      if (nodes > nodeLimit) return null;
    }
    return null;
  };

  return search(initialCandidates());
}

// -------------------------------------------------------------- clue removal

/**
 * Cells in a random order of 180°-symmetric pairs, centre first on its own.
 * Removing given clues in symmetric pairs keeps the classic newspaper look.
 */
function symmetricOrder(rnd: () => number): number[][] {
  const pairs: number[][] = [[40]];
  for (let i = 0; i < 40; i++) pairs.push([i, 80 - i]);
  return shuffle(pairs, rnd);
}

/**
 * Whether the puzzle is finishable by techniques alone, capped at `cap`.
 * Uniqueness is checked separately — this is only about the route there.
 */
function solvableWithin(geom: Geometry, givens: number[], cap: number): boolean {
  const r = solve(geom, givens, {
    maxSolutions: 1,
    maxDifficulty: cap,
    nodeLimit: 4000,
    start: candidatesFromGivens(givens),
  });
  return !r.aborted && r.count === 1 && r.guesses === 0;
}

/**
 * Dig clues out of the solved grid, keeping the puzzle unique throughout.
 * For the logical levels each removal must also leave the grid finishable
 * under the level's technique cap, so difficulty is steered while digging
 * rather than discovered afterwards.
 */
export function digClues(
  geom: Geometry,
  solution: number[],
  level: Level,
  rnd: () => number,
): number[] {
  const cap = LEVEL_TECHNIQUE_CAP[level];
  const want = level - 1;
  /*
   * Extra units make each given worth more, so a fixed floor overshoots on
   * the constraint-rich combos — a colour grid at 20 givens still solves on
   * singles. Scale by how many units there are; the top levels ignore the
   * floor entirely and dig until nothing more comes out, because forced
   * guessing lives at the bottom of the dig.
   */
  const scaled = Math.round((GIVENS_TARGET[level] * 27) / geom.units.length);
  const floor = cap === 0 ? Math.max(0, scaled - 4) : scaled;
  const givens = [...solution];
  let count = CELLS;

  const tryRemove = (cells: number[]): boolean => {
    const backup = cells.map((c) => givens[c]);
    for (const c of cells) givens[c] = 0;
    const keeps =
      isUnique(geom, givens, 12000) && (cap === 0 || solvableWithin(geom, givens, cap));
    if (keeps) count -= cells.length;
    else cells.forEach((c, k) => (givens[c] = backup[k]));
    return keeps;
  };

  /*
   * With the cap in place the score cannot pass `want` — the cap *is* the
   * wanted rung — so the dig can simply stop the moment the puzzle first
   * demands the level's technique. Checked only once the board is sparse
   * enough for the question to be worth asking.
   */
  const hardEnough = (): boolean =>
    cap !== 0 && want > 0 && count < 50 && difficultyScore(classify(geom, givens, 8000)) >= want;

  for (const pair of symmetricOrder(rnd)) {
    if (count - pair.length < floor) break;
    if (tryRemove(pair) && hardEnough()) return givens;
  }

  /*
   * A second, symmetry-breaking pass. The pairs pass leaves clues that only
   * survived because their partner was load-bearing; taking those singly
   * digs meaningfully deeper, and depth is where the harder techniques
   * start being forced.
   */
  if (level >= 3) {
    const singles = shuffle(
      Array.from({ length: CELLS }, (_, i) => i).filter((i) => givens[i] !== 0),
      rnd,
    );
    for (const cell of singles) {
      if (count <= floor) break;
      if (tryRemove([cell]) && hardEnough()) return givens;
    }
  }
  return givens;
}

// ------------------------------------------------------------------ assembly

/** Deterministic seed: same variants, level and number → same puzzle, forever. */
export function puzzleSeed(variants: Variants, level: Level, number: number): number {
  let h = 0x811c9dc5 ^ (level * 0x9e3779b1);
  for (const ch of variantCode(variants)) {
    h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  }
  h = Math.imul(h ^ number, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Build the puzzle numbered `number` at `level` for this variant combination.
 * Deterministic from its id, so puzzle numbers can be shared and tracked.
 *
 * Attempts walk: layouts → solution → dig → classify. The dig already steers
 * difficulty, so most attempts land on or next to the wanted rung; the loop
 * keeps the closest and stops early on an exact hit.
 */
export function generatePuzzle(variants: Variants, level: Level, number: number): Puzzle {
  const want = level - 1;
  const seed = puzzleSeed(variants, level, number);
  const rnd = mulberry32(seed);

  let best: { geom: Geometry; givens: number[]; solution: number[]; score: number } | null = null;
  let bestDistance = Infinity;

  // Exact rung or bust for a while, then settle for the next rung over —
  // the heavy combos can spend half a minute chasing a rung that this seed
  // simply will not produce, and one step off is a fine puzzle.
  for (let attempt = 0; attempt < 48 && bestDistance > 0; attempt++) {
    if (attempt >= 8 && bestDistance <= 1) break;
    if (attempt >= 24 && bestDistance <= 2) break;
    const boxes = variants.jigsaw ? carveJigsaw(rnd) : classicBoxes();
    if (boxes === null) continue;

    // The solution is found under every rule except colour; the colour
    // classes are then dealt from it, which satisfies them by construction.
    const solution = randomSolution(buildGeometry({ ...variants, colour: false }, boxes), rnd);
    if (solution === null) continue;

    const colours = variants.colour ? colourClasses(solution, boxes, rnd) : null;
    const geom = buildGeometry(variants, boxes, colours);

    const givens = digClues(geom, solution, level, rnd);
    const score = difficultyScore(classify(geom, givens));
    const distance = Math.abs(score - want);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { geom, givens, solution, score };
    }
  }

  if (!best) throw new Error(`could not generate ${variantCode(variants)}${level}-${number}`);
  return {
    variants,
    boxes: best.geom.boxes,
    colours: best.geom.colours,
    givens: best.givens,
    solution: best.solution,
    difficulty: level,
    seed,
    rating: best.score,
  };
}
