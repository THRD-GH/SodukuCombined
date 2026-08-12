import { CELLS, colOf, maskToDigits, popcount, rowOf } from '../core/grid.ts';
import { diagonalCells, percentUnits, windowCells } from '../core/geometry.ts';
import type { Game } from '../game/state.ts';
import type { Settings } from '../game/storage.ts';
import { el } from './dom.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface CellNodes {
  root: HTMLDivElement;
  big: HTMLSpanElement;
  marks: HTMLSpanElement[];
  /** Structural classes that never change. */
  base: string;
}

export class Board {
  readonly root: HTMLDivElement;
  private cells: CellNodes[] = [];
  private game: Game;
  /** Live reference — the settings panel mutates this object in place. */
  private settings: Settings;

  constructor(game: Game, settings: Settings) {
    this.game = game;
    this.settings = settings;
    this.root = el('div', { class: 'board', role: 'grid', 'aria-label': 'Sudoku grid' });
    this.build();
  }

  /** Cells a hint is pointing at. Cleared as soon as play resumes. */
  private spotlit = new Set<number>();

  /** Draw attention to the cells a hint concerns. Pass [] to clear. */
  spotlight(cells: number[]): void {
    this.spotlit = new Set(cells);
    this.render();
  }

  /** Cell index under an event, or -1. */
  indexOf(e: Event): number {
    const target = (e.target as HTMLElement | null)?.closest('.cell');
    if (!target) return -1;
    const raw = (target as HTMLElement).dataset.i;
    return raw === undefined ? -1 : Number(raw);
  }

  private build(): void {
    const { puzzle } = this.game;
    const variants = puzzle.variants;

    // Cells on an active diagonal: both for X, the anti-diagonal for Percent.
    const onDiagonal = new Set<number>();
    if (variants.x) for (const diag of diagonalCells()) for (const c of diag) onDiagonal.add(c);
    if (variants.percent) for (const c of percentUnits().slash) onDiagonal.add(c);

    /** Which window a cell sits in, for the per-window tint. */
    const windowOf = new Map<number, number>();
    if (variants.hyper) {
      windowCells().forEach((w, k) => w.forEach((c) => windowOf.set(c, k)));
    } else if (variants.percent) {
      // Percent's circles are hyper windows 0 and 3; they keep those hues.
      percentUnits().windows.forEach((w, k) => w.forEach((c) => windowOf.set(c, k === 0 ? 0 : 3)));
    }

    /*
     * Structural tints — a unique colour per jigsaw region, per window, and
     * a wash along the diagonals — only while the Colour variant is off.
     * With it on, cell colour *is* the rule, and a second colour system on
     * the same board would make both unreadable; structure falls back to
     * borders, keylines and lines, which stay on regardless.
     */
    const structural = !variants.colour;

    /*
     * Nine real rows, so the grid reports itself the way a screen reader
     * expects. They lay out as `display: contents`, which leaves the 81 cells
     * as direct children of the CSS grid — the visual board is unchanged.
     */
    const rows: HTMLDivElement[] = [];
    for (let r = 0; r < 9; r++) {
      const row = el('div', { class: 'row', role: 'row', 'aria-rowindex': r + 1 });
      rows.push(row);
      this.root.append(row);
    }

    for (let i = 0; i < CELLS; i++) {
      const r = rowOf(i);
      const c = colOf(i);

      const classes = ['cell'];
      /*
       * Region borders are drawn per cell, against the neighbour on each
       * side. For classic boxes this reproduces the usual 3x3 dividers; for
       * jigsaw it traces whatever shape the carve produced, at no extra cost.
       */
      if (c !== 0 && puzzle.boxes[i] !== puzzle.boxes[i - 1]) classes.push('reg-l');
      if (r !== 0 && puzzle.boxes[i] !== puzzle.boxes[i - 9]) classes.push('reg-t');
      if (onDiagonal.has(i)) {
        classes.push('diag');
        if (structural) classes.push('diag-tint');
      }
      if (windowOf.has(i)) {
        classes.push('window');
        if (structural) classes.push(`win-${windowOf.get(i)}`);
      }
      if (variants.colour && puzzle.colours) classes.push(`clr-${puzzle.colours[i]}`);
      if (structural && variants.jigsaw) classes.push(`reg-c${puzzle.boxes[i]}`);

      const big = el('span', { class: 'big' });
      const marksBox = el('span', { class: 'marks' });
      const marks: HTMLSpanElement[] = [];
      for (let d = 1; d <= 9; d++) {
        const mark = el('span', { class: 'mark' });
        marks.push(mark);
        marksBox.append(mark);
      }

      const root = el(
        'div',
        {
          class: classes.join(' '),
          'data-i': i,
          role: 'gridcell',
          'aria-colindex': c + 1,
          // Roving focus: only the selected cell is in the tab order.
          tabindex: -1,
        },
        marksBox,
        big,
      );
      this.cells.push({ root, big, marks, base: classes.join(' ') });
      rows[r].append(root);
    }

    /*
     * How a diagonal announces itself depends on what else is on. With the
     * Colour variant off, the diagonal cells simply wear a wash of their
     * own (the `diag-tint` class above) — no line across the grid. With
     * Colour on, every wash belongs to the colour rule, so each diagonal
     * cell gets a small cage outline instead, killer-style.
     */
    if (!structural && onDiagonal.size > 0) {
      this.root.append(this.buildDiagonalCages(onDiagonal));
    }
  }

  /** A small dashed cage in every diagonal cell, in one SVG over the board. */
  private buildDiagonalCages(cells: Set<number>): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'diagonals');
    svg.setAttribute('viewBox', '0 0 9 9');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const inset = 0.1;
    for (const c of cells) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('class', 'diag-cage');
      rect.setAttribute('x', String(colOf(c) + inset));
      rect.setAttribute('y', String(rowOf(c) + inset));
      rect.setAttribute('width', String(1 - 2 * inset));
      rect.setAttribute('height', String(1 - 2 * inset));
      svg.append(rect);
    }
    return svg;
  }

  render(): void {
    const g = this.game;
    const sel = g.selected;
    const selValue = sel >= 0 ? g.values[sel] : 0;
    const selPeers = sel >= 0 ? new Set(g.geometry.peers[sel]) : null;

    const clashes = findClashes(g);

    for (let i = 0; i < CELLS; i++) {
      const node = this.cells[i];
      const value = g.values[i];
      const given = g.isGiven(i);

      node.big.textContent = value === 0 ? '' : String(value);
      const digits = value === 0 ? maskToDigits(g.pencils[i]) : [];
      for (let d = 1; d <= 9; d++) {
        node.marks[d - 1].textContent = digits.includes(d) ? String(d) : '';
      }

      const cls = [node.base];
      if (given) cls.push('given');
      if (i === sel) cls.push('sel');
      else if (selPeers !== null && this.settings.highlightPeers && selPeers.has(i)) {
        // Peers come off the puzzle's geometry, so with X or colour in play
        // the highlight itself teaches what sees what.
        cls.push('peer');
      }
      if (this.settings.highlightSameDigit && value !== 0 && selValue !== 0 && value === selValue) {
        cls.push('same');
      }
      // One candidate left is an answer waiting to be written in — worth
      // spotting the moment an entry elsewhere reduces a cell to it. Derived
      // from the marks each render, so it clears itself when that stops holding.
      if (value === 0 && popcount(g.pencils[i]) === 1) cls.push('single');
      if (this.spotlit.has(i)) cls.push('spotlit');
      const wrong = g.errors.has(i);
      if (wrong) cls.push('error');
      else if (clashes.has(i)) cls.push('clash');
      node.root.className = cls.join(' ');

      /*
       * Everything a sighted player reads off the cell, said in words —
       * position, which region it belongs to, what is in it.
       */
      const content =
        value !== 0
          ? `${given ? 'given ' : ''}${value}${wrong ? ', wrong' : ''}`
          : digits.length > 0
            ? `pencil ${digits.join(' ')}`
            : 'empty';
      node.root.setAttribute(
        'aria-label',
        `R${rowOf(i) + 1}C${colOf(i) + 1}, region ${g.puzzle.boxes[i] + 1}, ${content}`,
      );
      node.root.setAttribute('aria-selected', String(i === sel));
      // Roving tabindex: tabbing into the board lands on the live cell.
      node.root.tabIndex = i === (sel >= 0 ? sel : 0) ? 0 : -1;
    }

    // Keep the keyboard where the game thinks it is, but never steal focus
    // from a button or a panel the player is using.
    if (sel >= 0 && this.root.contains(document.activeElement)) {
      this.cells[sel].root.focus({ preventScroll: true });
    }
  }
}

/**
 * Cells that break a rule against another filled cell: a repeat anywhere two
 * filled cells share a unit — and the units carry the variant rules, so a
 * repeat on a diagonal or in a colour group flags exactly like a row repeat.
 */
function findClashes(g: Game): Set<number> {
  const bad = new Set<number>();
  for (const unit of g.geometry.units) {
    const seen = new Map<number, number>();
    for (const c of unit) {
      const v = g.values[c];
      if (v === 0) continue;
      const first = seen.get(v);
      if (first !== undefined) {
        bad.add(first);
        bad.add(c);
      } else seen.set(v, c);
    }
  }
  return bad;
}
