/**
 * Worked visual examples for the technique guide, drawn as SVG boards.
 *
 * Each example is schematic in the usual textbook way: only the cells that
 * carry the pattern are shown, on a classic-box board. The logic *shown* is
 * genuine — the tinted cells, the emphasised digit and the struck
 * candidates always form a correct instance of the technique — but the rest
 * of the grid is left blank rather than pretending to be a full puzzle.
 *
 * Colours: gold = the pattern's cells, blue = its supporting link cells,
 * red strikes = what the pattern eliminates.
 */

import { el } from './dom.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface ExCell {
  /** 1-based row and column, as a player reads them. */
  r: number;
  c: number;
  /** A solved digit, drawn large. */
  big?: number;
  /** Plain candidates. */
  cands?: number[];
  /** Candidates that carry the pattern, drawn in the accent colour. */
  hit?: number[];
  /** Candidates the technique removes, drawn red and struck through. */
  strike?: number[];
  /** Cell tint: the pattern itself, or a supporting link cell. */
  role?: 'key' | 'link';
}

interface Example {
  cells: ExCell[];
  caption: string;
}

const EXAMPLES: Record<string, Example> = {
  'naked single': {
    caption: 'Row, column and box leave only 7 in R5C5.',
    cells: [
      { r: 5, c: 1, big: 1 },
      { r: 5, c: 2, big: 2 },
      { r: 5, c: 9, big: 3 },
      { r: 1, c: 5, big: 4 },
      { r: 2, c: 5, big: 5 },
      { r: 9, c: 5, big: 6 },
      { r: 4, c: 4, big: 8 },
      { r: 6, c: 6, big: 9 },
      { r: 5, c: 5, hit: [7], role: 'key' },
    ],
  },
  'hidden single': {
    caption: 'In row 3, only R3C7 can still take 4.',
    cells: [
      { r: 3, c: 1, big: 6 },
      { r: 3, c: 2, cands: [1, 2] },
      { r: 3, c: 3, cands: [2, 9] },
      { r: 3, c: 4, big: 8 },
      { r: 3, c: 5, cands: [1, 9] },
      { r: 3, c: 6, big: 3 },
      { r: 3, c: 7, cands: [2, 9], hit: [4], role: 'key' },
      { r: 3, c: 8, big: 5 },
      { r: 3, c: 9, cands: [1, 2] },
      { r: 1, c: 2, big: 4 },
      { r: 6, c: 3, big: 4 },
      { r: 8, c: 5, big: 4 },
      { r: 2, c: 9, big: 4 },
    ],
  },
  'locked candidates': {
    caption: 'In the box, 5 fits only in row 1 — so 5 leaves the rest of row 1.',
    cells: [
      { r: 1, c: 1, cands: [2], hit: [5], role: 'key' },
      { r: 1, c: 2, cands: [7], hit: [5], role: 'key' },
      { r: 2, c: 1, big: 3 },
      { r: 2, c: 2, big: 8 },
      { r: 2, c: 3, cands: [2, 7] },
      { r: 3, c: 1, big: 1 },
      { r: 3, c: 2, big: 9 },
      { r: 3, c: 3, cands: [2, 6] },
      { r: 1, c: 5, cands: [3], strike: [5] },
      { r: 1, c: 8, cands: [9], strike: [5] },
    ],
  },
  'naked subset': {
    caption: 'R4C2 and R4C6 own {3,8}, so 3 and 8 leave the rest of row 4.',
    cells: [
      { r: 4, c: 2, hit: [3, 8], role: 'key' },
      { r: 4, c: 6, hit: [3, 8], role: 'key' },
      { r: 4, c: 4, cands: [4], strike: [3, 8] },
      { r: 4, c: 9, cands: [9], strike: [8] },
      { r: 4, c: 1, big: 1 },
      { r: 4, c: 7, big: 5 },
    ],
  },
  'hidden subset': {
    caption: 'In column 5, digits 2 and 6 fit only in two cells — nothing else stays there.',
    cells: [
      { r: 2, c: 5, hit: [2, 6], strike: [4], role: 'key' },
      { r: 7, c: 5, hit: [2, 6], strike: [9], role: 'key' },
      { r: 1, c: 5, big: 1 },
      { r: 4, c: 5, cands: [4, 9] },
      { r: 5, c: 5, big: 7 },
      { r: 6, c: 5, cands: [4, 9] },
      { r: 9, c: 5, big: 3 },
    ],
  },
  'naked quad': {
    caption: 'Four cells in row 6 own {1,4,6,9}; those digits leave the others.',
    cells: [
      { r: 6, c: 1, hit: [1, 4], role: 'key' },
      { r: 6, c: 3, hit: [4, 6, 9], role: 'key' },
      { r: 6, c: 5, hit: [1, 6, 9], role: 'key' },
      { r: 6, c: 7, hit: [1, 4, 9], role: 'key' },
      { r: 6, c: 8, cands: [2], strike: [4, 9] },
      { r: 6, c: 2, big: 3 },
      { r: 6, c: 9, cands: [2, 5] },
    ],
  },
  'hidden quad': {
    caption: 'In column 4, digits {2,5,7,8} fit only in four cells — their other candidates go.',
    cells: [
      { r: 1, c: 4, hit: [2, 5], strike: [3], role: 'key' },
      { r: 3, c: 4, hit: [5, 7], role: 'key' },
      { r: 6, c: 4, hit: [2, 7, 8], strike: [6], role: 'key' },
      { r: 8, c: 4, hit: [5, 8], role: 'key' },
      { r: 2, c: 4, cands: [3, 6] },
      { r: 5, c: 4, big: 1 },
      { r: 9, c: 4, cands: [3, 6] },
    ],
  },
  'x-wing': {
    caption: 'Digit 6 sits in the same two columns of rows 2 and 7 — it leaves those columns elsewhere.',
    cells: [
      { r: 2, c: 3, hit: [6], role: 'key' },
      { r: 2, c: 8, hit: [6], role: 'key' },
      { r: 7, c: 3, hit: [6], role: 'key' },
      { r: 7, c: 8, hit: [6], role: 'key' },
      { r: 4, c: 3, cands: [4], strike: [6] },
      { r: 9, c: 8, cands: [7], strike: [6] },
    ],
  },
  'xy-wing': {
    caption: 'Pivot {2,7} with pincers {7,9} and {2,9}: one pincer is always 9.',
    cells: [
      { r: 4, c: 4, hit: [2, 7], role: 'key' },
      { r: 4, c: 8, hit: [7, 9], role: 'link' },
      { r: 6, c: 4, hit: [2, 9], role: 'link' },
      { r: 6, c: 8, cands: [3], strike: [9] },
    ],
  },
  'xyz-wing': {
    caption: 'Pivot {1,5,8} with pincers {5,8} and {1,8}: one of the three is always 8.',
    cells: [
      { r: 5, c: 5, hit: [1, 5, 8], role: 'key' },
      { r: 5, c: 2, hit: [5, 8], role: 'link' },
      { r: 4, c: 4, hit: [1, 8], role: 'link' },
      { r: 5, c: 4, cands: [9], strike: [8] },
    ],
  },
  swordfish: {
    caption: 'Digit 3 keeps to columns 2, 5 and 8 across rows 1, 5 and 9.',
    cells: [
      { r: 1, c: 2, hit: [3], role: 'key' },
      { r: 1, c: 5, hit: [3], role: 'key' },
      { r: 5, c: 5, hit: [3], role: 'key' },
      { r: 5, c: 8, hit: [3], role: 'key' },
      { r: 9, c: 2, hit: [3], role: 'key' },
      { r: 9, c: 8, hit: [3], role: 'key' },
      { r: 3, c: 5, cands: [7], strike: [3] },
      { r: 7, c: 2, cands: [1], strike: [3] },
    ],
  },
  'turbot fish': {
    caption: 'Two strong links on 4, joined along row 8: one far end is 4.',
    cells: [
      { r: 1, c: 2, hit: [4], role: 'key' },
      { r: 8, c: 2, hit: [4], role: 'link' },
      { r: 8, c: 6, hit: [4], role: 'link' },
      { r: 3, c: 6, hit: [4], role: 'key' },
      { r: 1, c: 6, cands: [9], strike: [4] },
      { r: 3, c: 2, cands: [2], strike: [4] },
    ],
  },
  'w-wing': {
    caption: 'Two {5,9} cells joined by row 4, where 9 has just two places: 5 leaves what sees both.',
    cells: [
      { r: 2, c: 3, hit: [5, 9], role: 'key' },
      { r: 6, c: 8, hit: [5, 9], role: 'key' },
      { r: 4, c: 3, hit: [9], cands: [2], role: 'link' },
      { r: 4, c: 8, hit: [9], cands: [6], role: 'link' },
      { r: 6, c: 3, cands: [7], strike: [5] },
      { r: 2, c: 8, cands: [1], strike: [5] },
    ],
  },
  jellyfish: {
    caption: 'Digit 2 keeps to the same four columns across four rows — the four-line fish.',
    cells: [
      { r: 1, c: 1, hit: [2], role: 'key' },
      { r: 1, c: 4, hit: [2], role: 'key' },
      { r: 4, c: 4, hit: [2], role: 'key' },
      { r: 4, c: 6, hit: [2], role: 'key' },
      { r: 6, c: 6, hit: [2], role: 'key' },
      { r: 6, c: 9, hit: [2], role: 'key' },
      { r: 9, c: 1, hit: [2], role: 'key' },
      { r: 9, c: 9, hit: [2], role: 'key' },
      { r: 3, c: 1, cands: [8], strike: [2] },
      { r: 7, c: 6, cands: [5], strike: [2] },
    ],
  },
};

const make = (tag: string, attrs: Record<string, string>, text?: string): SVGElement => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Candidate positions mirror the keypad: 1 top-left, 9 bottom-right. */
const candX = (d: number): number => 0.22 + ((d - 1) % 3) * 0.28;
const candY = (d: number): number => 0.3 + Math.floor((d - 1) / 3) * 0.28;

function drawBoard(example: Example): SVGSVGElement {
  const svg = make('svg', {
    class: 'tg-board',
    viewBox: '-0.05 -0.05 9.1 9.1',
    'aria-hidden': 'true',
  }) as SVGSVGElement;

  // Cell tints under everything.
  for (const cell of example.cells) {
    if (!cell.role) continue;
    svg.append(
      make('rect', {
        class: cell.role === 'key' ? 'tg-key' : 'tg-link',
        x: String(cell.c - 1),
        y: String(cell.r - 1),
        width: '1',
        height: '1',
      }),
    );
  }

  // Hairlines and box borders.
  for (let k = 1; k < 9; k++) {
    const heavy = k % 3 === 0;
    svg.append(
      make('line', { class: heavy ? 'tg-box' : 'tg-rule', x1: String(k), y1: '0', x2: String(k), y2: '9' }),
      make('line', { class: heavy ? 'tg-box' : 'tg-rule', x1: '0', y1: String(k), x2: '9', y2: String(k) }),
    );
  }
  svg.append(make('rect', { class: 'tg-frame', x: '0', y: '0', width: '9', height: '9' }));

  for (const cell of example.cells) {
    const x0 = cell.c - 1;
    const y0 = cell.r - 1;
    if (cell.big !== undefined) {
      svg.append(
        make(
          'text',
          { class: 'tg-big', x: String(x0 + 0.5), y: String(y0 + 0.72) },
          String(cell.big),
        ),
      );
      continue;
    }
    const put = (d: number, cls: string): void => {
      svg.append(
        make(
          'text',
          { class: cls, x: String(x0 + candX(d)), y: String(y0 + candY(d)) },
          String(d),
        ),
      );
    };
    for (const d of cell.cands ?? []) put(d, 'tg-cand');
    for (const d of cell.hit ?? []) put(d, 'tg-hit');
    for (const d of cell.strike ?? []) {
      put(d, 'tg-strike');
      svg.append(
        make('line', {
          class: 'tg-slash',
          x1: String(x0 + candX(d) - 0.12),
          y1: String(y0 + candY(d) + 0.09),
          x2: String(x0 + candX(d) + 0.12),
          y2: String(y0 + candY(d) - 0.15),
        }),
      );
    }
  }
  return svg;
}

/** The worked example for a technique, board and caption, or null. */
export function techniqueExample(name: string): HTMLElement | null {
  const example = EXAMPLES[name];
  if (!example) return null;
  return el(
    'div',
    { class: 'tg-example' },
    drawBoard(example),
    el('p', { class: 'tg-caption' }, example.caption),
  );
}
