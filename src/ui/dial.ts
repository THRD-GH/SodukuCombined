import type { Level } from '../core/types.ts';
import { BELT_COLOURS } from './stars.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The dial sweeps 240°, six stops, 7 o'clock round to 5 o'clock. */
const START = -120;
const SWEEP = 240;
const STEP = SWEEP / 5;

const angleFor = (level: Level): number => START + (level - 1) * STEP;

const point = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
};

export interface LevelDial {
  root: SVGSVGElement;
  set(level: Level): void;
}

/**
 * A rotary difficulty selector in the site's print language: a flat paper
 * disc ringed in ink on a hard offset shadow, a bold pointer, and a ring
 * of belt-coloured stops edged in ink. Tap a stop or drag the knob round —
 * both land on the nearest stop.
 */
export function buildLevelDial(initial: Level, onChange: (level: Level) => void): LevelDial {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'dial');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('role', 'slider');
  svg.setAttribute('aria-label', 'Difficulty level');
  svg.setAttribute('aria-valuemin', '1');
  svg.setAttribute('aria-valuemax', '6');
  svg.setAttribute('tabindex', '0');

  const make = (
    tag: string,
    attrs: Record<string, string>,
    parent: Element = svg,
    text?: string,
  ): SVGElement => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  };

  // Stop marks in the belt ladder's own colours, each edged in ink so the
  // white and black belts read on whichever theme matches them.
  const numbers: SVGElement[] = [];
  for (let l = 1; l <= 6; l++) {
    const deg = angleFor(l as Level);
    const [x1, y1] = point(31.5, deg);
    const [x2, y2] = point(36.5, deg);
    make('line', {
      class: 'dial-tick-casing',
      x1: String(x1),
      y1: String(y1),
      x2: String(x2),
      y2: String(y2),
    });
    make('line', {
      class: 'dial-tick',
      x1: String(x1),
      y1: String(y1),
      x2: String(x2),
      y2: String(y2),
      stroke: BELT_COLOURS[l - 1],
    });
    const [tx, ty] = point(44, deg);
    numbers.push(
      make('text', { class: 'dial-num', x: String(tx), y: String(ty + 3.5) }, svg, String(l)),
    );
  }

  // A flat paper disc on a hard offset shadow, ringed in ink — the same
  // print language as the board and the panels, not a moulded knob.
  make('circle', { class: 'dial-shadow', cx: '54', cy: '55', r: '27' });
  make('circle', { class: 'dial-knob', cx: '50', cy: '50', r: '27' });

  // Only the pointer turns: a bold ink bar from near the centre to the rim.
  const rotor = make('g', { class: 'dial-rotor' });
  make('line', { class: 'dial-pointer', x1: '50', y1: '41', x2: '50', y2: '27' }, rotor);
  make('circle', { class: 'dial-hub', cx: '50', cy: '50', r: '3' }, rotor);

  let current = initial;

  const apply = (level: Level): void => {
    current = level;
    rotor.setAttribute('transform', `rotate(${angleFor(level)} 50 50)`);
    numbers.forEach((n, i) => n.classList.toggle('on', i + 1 === level));
    svg.setAttribute('aria-valuenow', String(level));
  };

  const pick = (e: PointerEvent): void => {
    const rect = svg.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * 100;
    const vy = ((e.clientY - rect.top) / rect.height) * 100;
    // Clockwise angle from 12 o'clock, clamped onto the sweep.
    const deg = (Math.atan2(vx - 50, 50 - vy) * 180) / Math.PI;
    const clamped = Math.max(START, Math.min(START + SWEEP, deg));
    const level = (Math.round((clamped - START) / STEP) + 1) as Level;
    if (level !== current) {
      apply(level);
      onChange(level);
    }
  };

  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pick(e);
  });
  svg.addEventListener('pointermove', (e) => {
    if (e.buttons > 0) pick(e);
  });
  svg.addEventListener('keydown', (e) => {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? -1
          : 0;
    if (delta === 0) return;
    e.preventDefault();
    const level = Math.max(1, Math.min(6, current + delta)) as Level;
    if (level !== current) {
      apply(level);
      onChange(level);
    }
  });

  apply(initial);
  return { root: svg, set: apply };
}
