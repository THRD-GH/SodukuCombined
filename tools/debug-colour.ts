/** Probe: how findable is a solution grid on top of a random colour layout? */
import { buildGeometry } from '../src/core/geometry.ts';
import { colourLayout, randomSolution } from '../src/core/generator.ts';
import { mulberry32, shuffle } from '../src/core/rng.ts';
import { solve } from '../src/core/solver.ts';
import { CELLS } from '../src/core/grid.ts';
import { NO_VARIANTS } from '../src/core/types.ts';

const rnd = mulberry32(12345);
const plain = buildGeometry(NO_VARIANTS);

for (let attempt = 0; attempt < 10; attempt++) {
  const colours = colourLayout(plain, rnd);
  if (!colours) {
    console.log('layout failed');
    continue;
  }
  const geom = buildGeometry({ ...NO_VARIANTS, colour: true }, undefined, colours);

  const givens = new Array<number>(CELLS).fill(0);
  const firstRow = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd);
  for (let c = 0; c < 9; c++) givens[c] = firstRow[c];

  for (const [label, opts] of [
    ['seeded singles 120k', { maxSolutions: 1, maxDifficulty: 1, nodeLimit: 120000, seeded: true }],
    ['bare singles 500k', { maxSolutions: 1, maxDifficulty: 1, nodeLimit: 500000, seeded: false }],
  ] as const) {
    const t0 = performance.now();
    const r = solve(geom, opts.seeded ? givens : new Array<number>(CELLS).fill(0), {
      maxSolutions: opts.maxSolutions,
      maxDifficulty: opts.maxDifficulty,
      nodeLimit: opts.nodeLimit,
    });
    console.log(
      `#${attempt} ${label}: count=${r.count} aborted=${r.aborted} guesses=${r.guesses} ` +
        `${Math.round(performance.now() - t0)}ms`,
    );
  }
  const t1 = performance.now();
  const naive = randomSolution(geom, rnd, 200000);
  console.log(`#${attempt} naive 200k: ${naive ? 'FOUND' : 'null'} ${Math.round(performance.now() - t1)}ms`);
}
