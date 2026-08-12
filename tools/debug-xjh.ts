/** How often does a random jigsaw carve admit an X + hyper solution? */
import { buildGeometry } from '../src/core/geometry.ts';
import { carveJigsaw, randomSolution } from '../src/core/generator.ts';
import { mulberry32 } from '../src/core/rng.ts';

const rnd = mulberry32(777);
let carved = 0;
let solved = 0;
const t0 = performance.now();
for (let i = 0; i < 40; i++) {
  const boxes = carveJigsaw(rnd);
  if (!boxes) continue;
  carved++;
  const geom = buildGeometry({ x: true, jigsaw: true, hyper: true, colour: false }, boxes);
  if (randomSolution(geom, rnd, 20000)) solved++;
}
console.log(
  `carved ${carved}/40, solved ${solved}/${carved}, ${Math.round(performance.now() - t0)}ms total`,
);
