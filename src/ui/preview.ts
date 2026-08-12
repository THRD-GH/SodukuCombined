/**
 * Mini sudoku boards, drawn as inline SVG, for the menu's game picker. A
 * variant is a visual idea before it is a rule, and a thumbnail that *shows*
 * the diagonals, the carved regions, the windows or the colour wash explains
 * it faster than any label. The composite preview stacks whichever are on,
 * which is exactly what the real board will do.
 *
 * Everything is styled through CSS classes, so the previews follow the theme.
 */

import { CELLS, classicBoxes, colOf, rowOf } from '../core/grid.ts';
import { diagonalCells, percentUnits, windowCells } from '../core/geometry.ts';
import { carveJigsaw } from '../core/generator.ts';
import { mulberry32 } from '../core/rng.ts';
import type { Variants } from '../core/types.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * One fixed, pleasant symmetric carve for every jigsaw thumbnail. Seeded so
 * it is the same shape on every visit — a preview that changed each time
 * would read as "random layout", which is true but not the point being made.
 */
const SAMPLE_JIGSAW: number[] = carveJigsaw(mulberry32(7)) ?? classicBoxes();

/** The canonical latin colouring: all nine colours, once per row and box. */
const sampleColour = (i: number): number =>
  (colOf(i) + (rowOf(i) % 3) * 3 + ((rowOf(i) / 3) | 0)) % 9;

const make = (tag: string, attrs: Record<string, string>): SVGElement => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

/** A mini board with the given variants dressed on it. */
export function boardPreview(v: Variants): SVGSVGElement {
  const svg = make('svg', {
    class: 'board-preview',
    viewBox: '-0.06 -0.06 9.12 9.12',
    'aria-hidden': 'true',
  }) as SVGSVGElement;

  const boxes = v.jigsaw ? SAMPLE_JIGSAW : classicBoxes();

  /*
   * Same rule as the board: structural tints (regions, windows, diagonals)
   * only while the Colour variant is off — with it on, cell colour is the
   * rule itself, and the preview should promise exactly what the board does.
   */
  const structural = !v.colour;

  // The wash layer, under everything: colour groups, or jigsaw region tints.
  if (v.colour) {
    for (let i = 0; i < CELLS; i++) {
      svg.append(
        make('rect', {
          class: `pv-fill pv-clr-${sampleColour(i)}`,
          x: String(colOf(i)),
          y: String(rowOf(i)),
          width: '1',
          height: '1',
        }),
      );
    }
  } else if (v.jigsaw) {
    for (let i = 0; i < CELLS; i++) {
      svg.append(
        make('rect', {
          class: `pv-fill pv-reg-${boxes[i]}`,
          x: String(colOf(i)),
          y: String(rowOf(i)),
          width: '1',
          height: '1',
        }),
      );
    }
  }

  // Windows: hyper's four, or — hyper off — Percent's two circles, which
  // are hyper windows 0 and 3 and keep those hues. Washed and keylined
  // normally; a dashed cage around the box when Colour owns the washes.
  const windows: [number[], number][] = v.hyper
    ? windowCells().map((w, k) => [w, k] as [number[], number])
    : v.percent
      ? percentUnits().windows.map((w, k) => [w, k === 0 ? 0 : 3] as [number[], number])
      : [];
  for (const [window, k] of windows) {
    const r = rowOf(window[0]);
    const c = colOf(window[0]);
    svg.append(
      structural
        ? make('rect', {
            class: `pv-window pv-win-${k}`,
            x: String(c),
            y: String(r),
            width: '3',
            height: '3',
          })
        : make('rect', {
            class: 'pv-window-cage',
            x: String(c + 0.1),
            y: String(r + 0.1),
            width: '2.8',
            height: '2.8',
          }),
    );
  }

  // Hairline grid.
  for (let k = 1; k < 9; k++) {
    svg.append(make('line', { class: 'pv-rule', x1: String(k), y1: '0', x2: String(k), y2: '9' }));
    svg.append(make('line', { class: 'pv-rule', x1: '0', y1: String(k), x2: '9', y2: String(k) }));
  }

  // Region borders, traced cell against neighbour — same idea as the board.
  for (let i = 0; i < CELLS; i++) {
    const r = rowOf(i);
    const c = colOf(i);
    if (c < 8 && boxes[i] !== boxes[i + 1]) {
      svg.append(
        make('line', {
          class: 'pv-region',
          x1: String(c + 1),
          y1: String(r),
          x2: String(c + 1),
          y2: String(r + 1),
        }),
      );
    }
    if (r < 8 && boxes[i] !== boxes[i + 9]) {
      svg.append(
        make('line', {
          class: 'pv-region',
          x1: String(c),
          y1: String(r + 1),
          x2: String(c + 1),
          y2: String(r + 1),
        }),
      );
    }
  }

  // Diagonals: X owns both; Percent alone has only its slash. Washed cells
  // normally, small cages instead when the Colour variant owns the washes.
  const [main, anti] = diagonalCells();
  const diagCells = new Set<number>(v.x ? [...main, ...anti] : v.percent ? anti : []);
  for (const c of diagCells) {
    svg.append(
      structural
        ? make('rect', {
            class: 'pv-diag-fill',
            x: String(colOf(c)),
            y: String(rowOf(c)),
            width: '1',
            height: '1',
          })
        : make('rect', {
            class: 'pv-diag-cage',
            x: String(colOf(c) + 0.12),
            y: String(rowOf(c) + 0.12),
            width: '0.76',
            height: '0.76',
          }),
    );
  }

  svg.append(make('rect', { class: 'pv-frame', x: '0', y: '0', width: '9', height: '9' }));
  return svg;
}
