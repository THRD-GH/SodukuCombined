/** Does a 180°-symmetric jigsaw carve rescue the X+jigsaw+hyper combo? */
import { CELLS, NEIGHBOURS } from '../src/core/grid.ts';
import { buildGeometry } from '../src/core/geometry.ts';
import { randomSolution } from '../src/core/generator.ts';
import { mulberry32 } from '../src/core/rng.ts';
import type { Variants } from '../src/core/types.ts';
import { NO_VARIANTS, variantCode } from '../src/core/types.ts';

function carveSymmetric(rnd: () => number): number[] | null {
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
            // The mirror cell must be free too, and not the mirror of us.
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

    // Whatever is left is the centre region: nine cells, symmetric by
    // construction — it only has to be connected.
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

const combos: Variants[] = [
  { ...NO_VARIANTS, jigsaw: true },
  { ...NO_VARIANTS, jigsaw: true, x: true },
  { ...NO_VARIANTS, jigsaw: true, hyper: true },
  { ...NO_VARIANTS, jigsaw: true, x: true, hyper: true },
];

for (const v of combos) {
  const rnd = mulberry32(4242);
  let solved = 0;
  let carves = 0;
  const t0 = performance.now();
  for (let i = 0; i < 30; i++) {
    const boxes = carveSymmetric(rnd);
    if (!boxes) continue;
    carves++;
    if (randomSolution(buildGeometry(v, boxes), rnd, 20000)) solved++;
  }
  console.log(
    `${variantCode(v).padEnd(4)}: ${solved}/${carves} solved, ${Math.round(performance.now() - t0)}ms`,
  );
}
