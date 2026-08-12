# Sudoku Variants

A web sudoku where the variants mix freely: **X** (diagonals), **Jigsaw**
(irregular regions), **Hyper** (four extra windows) and **Colour** (nine
colour groups) can be toggled in any combination, from plain sudoku to all
four at once. Compact touch-first control scheme, a six-star level ladder,
and numbered-puzzle history per variant mix.

Vite + TypeScript, no runtime dependencies. `npm run dev`, `npm run build`.

## Puzzles

Every puzzle is generated locally, on a worker, and proven to have exactly one
solution. Ids are deterministic: `S3-10` (plain, level 3, puzzle 10), `X3-10`,
`XJHC6-1` — the same id builds the same grid on every device, so puzzles can
be shared as links.

Difficulty is measured, not asserted: the generator digs clues out under a
technique cap and rates each grid by the hardest step a solver is forced to
take (singles → locked candidates → subsets → x-wing → guesswork). The engine
works on per-puzzle *units* — rows, columns, regions, diagonals, windows,
colour groups — so every technique automatically speaks every variant.

Jigsaw regions are carved with 180° rotational symmetry; measured on the
X + Jigsaw + Hyper stack, random asymmetric carves admitted a solution 0/30
times while symmetric ones manage roughly 1 in 10, which retries absorb.
Colour classes are dealt from the solution (one cell of each digit per class),
so a colour layout can never fail to exist.

## Installing

It is a PWA: installable from the browser, and it runs offline. The service
worker precaches the app shell; puzzles are generated locally and work offline
from the start.

`npm run build` regenerates `dist/sw.js` from the actual build output, so the
precache list always matches the hashed filenames. `npm run icons` redraws the
app icons.

## Controls

The cell holds a *set* of digits: one digit displays as an answer, two or more
display as pencil marks. That single idea explains the whole keypad.

| Gesture | Effect |
| --- | --- |
| Tap a keypad digit | Toggle that digit in the selected cell |
| Long-click / double-click a digit | Force it in as the answer, tidying peer candidates |
| Long-click CLEAR | Empty the cell |
| Long-click any cell | Pause |

Keyboard: arrows move, 1–9 enter, Shift+digit forces, Z undo, H hint, C check,
M fills marks, Escape pauses.

## Engine smoke test

```bash
node tools/smoke.ts
```

Generates a spread of puzzles across variant combinations and levels and
checks the invariants: valid layouts, unique solution, solution satisfies
every unit, deterministic rebuild.
