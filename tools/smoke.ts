/**
 * Engine smoke test: node tools/smoke.ts
 *
 * Generates a spread of puzzles across variant combinations and levels,
 * checks the invariants that must always hold (valid layouts, unique
 * solution, solution satisfies every unit), and reports timing + rating so
 * generator tuning has numbers to look at.
 */
import { buildGeometry, validRegionMap } from '../src/core/geometry.ts';
import { generatePuzzle } from '../src/core/generator.ts';
import { isUnique } from '../src/core/solver.ts';
import type { Level, Variants } from '../src/core/types.ts';
import { NO_VARIANTS, variantCode } from '../src/core/types.ts';

const combos: Variants[] = [
  { ...NO_VARIANTS },
  { ...NO_VARIANTS, x: true },
  { ...NO_VARIANTS, percent: true },
  { ...NO_VARIANTS, jigsaw: true },
  { ...NO_VARIANTS, hyper: true },
  { ...NO_VARIANTS, colour: true },
  { ...NO_VARIANTS, percent: true, jigsaw: true },
  { x: true, percent: true, jigsaw: true, hyper: true, colour: true },
];

const levels: Level[] = [1, 3, 6];

let failures = 0;

for (const variants of combos) {
  for (const level of levels) {
    const t0 = performance.now();
    let line = `${variantCode(variants).padEnd(4)} L${level} `;
    try {
      const p = generatePuzzle(variants, level, 1);
      const ms = Math.round(performance.now() - t0);
      const givens = p.givens.filter((d) => d !== 0).length;

      const problems: string[] = [];
      if (!validRegionMap(p.boxes)) problems.push('bad boxes');
      if (variants.colour && !validRegionMap(p.colours)) problems.push('bad colours');
      if (variants.jigsaw === false && p.boxes[0] !== 0) problems.push('boxes not classic');

      const geom = buildGeometry(p.variants, p.boxes, p.colours);
      for (const unit of geom.units) {
        const seen = new Set(unit.map((c) => p.solution[c]));
        if (seen.size !== 9) problems.push('solution breaks a unit');
      }
      for (let i = 0; i < 81; i++) {
        if (p.givens[i] !== 0 && p.givens[i] !== p.solution[i]) problems.push('given contradicts solution');
      }
      if (!isUnique(geom, p.givens, 200000)) problems.push('not unique');

      const again = generatePuzzle(variants, level, 1);
      if (JSON.stringify(again) !== JSON.stringify(p)) problems.push('not deterministic');

      line += `${String(ms).padStart(6)}ms  givens=${givens}  rating=${p.rating} (want ${level - 1})`;
      if (problems.length > 0) {
        failures++;
        line += `  FAIL: ${[...new Set(problems)].join(', ')}`;
      }
    } catch (err) {
      failures++;
      line += `  THREW: ${err instanceof Error ? err.message : String(err)}`;
    }
    console.log(line);
  }
}

console.log(failures === 0 ? '\nAll good.' : `\n${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
