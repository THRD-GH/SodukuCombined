import type { Variants } from '../core/types.ts';
import { NO_VARIANTS } from '../core/types.ts';
import { clear, el } from './dom.ts';
import { openOverlay } from './overlay.ts';
import { boardPreview } from './preview.ts';

interface VariantPage {
  title: string;
  /** The rule, taught: what is added, what it demands, what to watch for. */
  lesson: string;
  /** The mix the preview board draws. */
  show: Variants;
  caption: string;
}

/**
 * One page per rule, ending on how they mix. The boards are the same
 * previews the picker draws, so the guide teaches exactly what the menu
 * shows — and, like the technique guide, a page holds one rule and one
 * board so it fits a phone screen whole.
 */
const PAGES: VariantPage[] = [
  {
    title: 'Standard',
    lesson:
      'Every row, every column and every 3×3 box must hold the digits 1 to 9, each exactly once. The printed digits are the givens — they never move, and every puzzle here has exactly one solution reachable by logic alone.',
    show: { ...NO_VARIANTS },
    caption: 'Nine rows, nine columns, nine boxes.',
  },
  {
    title: 'X',
    lesson:
      'Both main diagonals also hold 1 to 9, each exactly once. That gives every diagonal cell two extra neighbours to respect — and the centre cell sits on both diagonals at once, which makes it the busiest cell on the board. The diagonal cells wear a gold wash; with Colour on they carry small cages instead.',
    show: { ...NO_VARIANTS, x: true },
    caption: 'The two diagonals, washed gold.',
  },
  {
    title: 'Percent',
    lesson:
      'The board wears a percent sign: the slash is the anti-diagonal, the two circles are 3×3 windows — and each of the three must hold 1 to 9 exactly once. It is a gentler cousin of X plus Hyper: one diagonal instead of two, two windows instead of four.',
    show: { ...NO_VARIANTS, percent: true },
    caption: 'Slash and two circles — the % shape.',
  },
  {
    title: 'Jigsaw',
    lesson:
      'The nine 3×3 boxes are replaced by nine irregular regions, each still holding 1 to 9 exactly once. The thick borders trace the shapes, and each region wears its own tint so it reads at a glance. Box habits stop working here — a region can reach four rows, so follow the borders, not the grid.',
    show: { ...NO_VARIANTS, jigsaw: true },
    caption: 'Nine carved regions, one tint each.',
  },
  {
    title: 'Hyper',
    lesson:
      'Four extra 3×3 boxes — the windows — sit at rows and columns 2–4 and 6–8, and each must hold 1 to 9 exactly once. A window cell answers to its row, its column, its normal box AND its window, so the middle of the board tightens considerably. Each window wears its own tint; under Colour they carry dashed cages instead.',
    show: { ...NO_VARIANTS, hyper: true },
    caption: 'The four windows, one tint each.',
  },
  {
    title: 'Colour',
    lesson:
      'The cells are painted in nine colours, nine cells of each, and every colour must hold 1 to 9 exactly once. A colour group is scattered across the board, so it links cells that share no row, column or box — check the far corners before repeating a digit on a colour. With Colour on, the cell tints belong to this rule; other variants mark themselves with cages and lines instead.',
    show: { ...NO_VARIANTS, colour: true },
    caption: 'Nine colours, each holding 1–9.',
  },
  {
    title: 'Mix them',
    lesson:
      'Any combination can be on at once, and every rule in play applies together — an X · Jigsaw · Hyper · Colour cell can answer to seven groups at a time. Each mix is its own pool of numbered puzzles at every level, the pips beside the name say how much game you have dialled up, and the peer highlight always shows exactly what the selected cell can see.',
    show: { x: true, percent: false, jigsaw: true, hyper: true, colour: true },
    caption: 'X · Jigsaw · Hyper · Colour, all at once.',
  },
];

export function openVariantGuide(): void {
  openOverlay((close) => {
    let current = 0;

    const title = el('h2', { class: 'guide-title' });
    const card = el('div', { class: 'guide-technique' });
    const progress = el('p', { class: 'guide-progress' });
    const back = el('button', { class: 'btn' }, 'Back');
    const next = el('button', { class: 'btn primary' });

    const draw = (): void => {
      const page = PAGES[current];
      title.textContent = page.title;
      clear(card);
      card.append(
        el('p', {}, page.lesson),
        el(
          'div',
          { class: 'tg-example' },
          boardPreview(page.show),
          el('p', { class: 'tg-caption' }, page.caption),
        ),
      );
      progress.textContent = `${current + 1} of ${PAGES.length}`;
      back.disabled = current === 0;
      next.textContent = current === PAGES.length - 1 ? 'Done' : 'Next';
    };

    back.addEventListener('click', () => {
      if (current > 0) current--;
      draw();
    });
    next.addEventListener('click', () => {
      if (current === PAGES.length - 1) close();
      else {
        current++;
        draw();
      }
    });

    draw();
    return el(
      'div',
      { class: 'panel guide' },
      el('div', { class: 'eyebrow' }, 'VARIANT GUIDE'),
      title,
      card,
      progress,
      el('div', { class: 'tutorial-actions' }, back, next),
    );
  });
}
