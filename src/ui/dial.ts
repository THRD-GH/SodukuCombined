import type { Level } from '../core/types.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The dial sweeps 240°, six stops, 7 o'clock round to 5 o'clock. */
const START = -120;
const SWEEP = 240;
const STEP = SWEEP / 5;

const angleFor = (level: Level): number => START + (level - 1) * STEP;

/** Same green-to-red ramp the stars use, so the dial face reads as a scale. */
const hueFor = (level: number): number => Math.round(132 - ((level - 1) / 5) * 132);

const point = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
};

export interface LevelDial {
  root: SVGSVGElement;
  set(level: Level): void;
}

/**
 * A rotary difficulty selector drawn like a radio's volume knob: a bezel, a
 * domed face with a ribbed grip, and a pointer mark, sitting inside a ring
 * of coloured stops. The whole grip rotates, ribs and all, so turning it
 * feels like turning a thing rather than moving a cursor. Tap a stop or
 * drag the knob round — both land on the nearest stop.
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

  // The dome shading. Stop colours come from theme variables, so the knob
  // is lamplit plastic at night and pale bakelite by day.
  const defs = make('defs', {});
  const grad = make('radialGradient', { id: 'dial-face-g', cx: '38%', cy: '30%', r: '80%' }, defs);
  make('stop', { offset: '0%', style: 'stop-color: var(--dial-hi)' }, grad);
  make('stop', { offset: '100%', style: 'stop-color: var(--dial-lo)' }, grad);

  // Stop marks and numbers, each wearing its level's colour.
  const numbers: SVGElement[] = [];
  for (let l = 1; l <= 6; l++) {
    const deg = angleFor(l as Level);
    const [x1, y1] = point(31.5, deg);
    const [x2, y2] = point(36, deg);
    make('line', {
      class: 'dial-tick',
      x1: String(x1),
      y1: String(y1),
      x2: String(x2),
      y2: String(y2),
      stroke: `hsl(${hueFor(l)} 62% 45%)`,
    });
    // The numbers wear the theme's ink, not the ramp — the coloured ticks
    // carry the scale, the digits' job is to be readable.
    const [tx, ty] = point(44, deg);
    numbers.push(
      make('text', { class: 'dial-num', x: String(tx), y: String(ty + 3.5) }, svg, String(l)),
    );
  }

  // Seated in a shallow well: shadow, bezel, then the domed face.
  make('ellipse', { class: 'dial-shadow', cx: '50', cy: '52.5', rx: '28', ry: '27' });
  make('circle', { class: 'dial-bezel', cx: '50', cy: '50', r: '28' });
  make('circle', { class: 'dial-face', cx: '50', cy: '50', r: '24', fill: 'url(#dial-face-g)' });

  /*
   * Everything that physically turns lives in one group: the ribbed grip
   * around the rim and the pointer mark. Rotating the group is what makes
   * the knob read as a knob.
   */
  const rotor = make('g', { class: 'dial-rotor' });
  for (let k = 0; k < 24; k++) {
    const deg = k * 15;
    const [x1, y1] = point(20.5, deg);
    const [x2, y2] = point(23.2, deg);
    make('line', {
      class: 'dial-rib',
      x1: String(x1),
      y1: String(y1),
      x2: String(x2),
      y2: String(y2),
    }, rotor);
  }
  make('line', { class: 'dial-pointer', x1: '50', y1: '29.5', x2: '50', y2: '38.5' }, rotor);

  // A soft gloss across the upper face, over the ribs, like light on a dome.
  make('ellipse', { class: 'dial-gloss', cx: '44', cy: '41', rx: '15', ry: '11' });

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
