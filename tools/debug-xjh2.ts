/** Feasibility per jigsaw combo, and whether a bigger budget changes it. */
import { buildGeometry } from '../src/core/geometry.ts';
import { carveJigsaw, randomSolution } from '../src/core/generator.ts';
import { mulberry32 } from '../src/core/rng.ts';
import type { Variants } from '../src/core/types.ts';
import { NO_VARIANTS, variantCode } from '../src/core/types.ts';

const combos: Variants[] = [
  { ...NO_VARIANTS, jigsaw: true, x: true },
  { ...NO_VARIANTS, jigsaw: true, hyper: true },
  { ...NO_VARIANTS, jigsaw: true, x: true, hyper: true },
];

for (const v of combos) {
  for (const budget of [20000, 200000]) {
    const rnd = mulberry32(4242);
    let solved = 0;
    let carves = 0;
    const t0 = performance.now();
    for (let i = 0; i < 30; i++) {
      const boxes = carveJigsaw(rnd);
      if (!boxes) continue;
      carves++;
      if (randomSolution(buildGeometry(v, boxes), rnd, budget)) solved++;
    }
    console.log(
      `${variantCode(v).padEnd(4)} budget ${String(budget).padStart(6)}: ` +
        `${solved}/${carves} solved, ${Math.round(performance.now() - t0)}ms`,
    );
  }
}
