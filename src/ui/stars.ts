const SVG = 'http://www.w3.org/2000/svg';

/**
 * Rules-complexity as colour: green at one pip, sliding through yellow and
 * orange to red. This ramp belongs to the combo pips alone — difficulty
 * ranks wear belts, and the two scales must not look related.
 */
function hueFor(count: number): number {
  const t = (Math.min(Math.max(count, 1), 6) - 1) / 5;
  return Math.round(132 - t * 132);
}

/**
 * The DanDoku belt ladder's colours, one per level, exactly as the site
 * paints them: white, yellow, green, blue, brown, and the ink-dark black
 * that carries the DAN tag.
 */
export const BELT_COLOURS = [
  '#fffdfa',
  '#efc44f',
  '#6c9a72',
  '#3979a8',
  '#8a563b',
  '#17273d',
] as const;

/**
 * One belt, drawn as the thing itself in the site's flat ink style: the
 * band with its stitch lines, a square knot with the fold of the wrap, two
 * tails hanging from it. Rank is said by colour, not by count — a blue
 * belt is one blue belt — so this replaces the star rows wherever
 * difficulty is shown. Outlined in the theme's ink so White reads on
 * paper and Black on night.
 */
export function belt(level: number, height = 14): HTMLSpanElement {
  const l = Math.min(Math.max(Math.round(level), 1), 6);
  const fill = BELT_COLOURS[l - 1];

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 48 22');
  svg.setAttribute('width', String(Math.round((height * 48) / 22)));
  svg.setAttribute('height', String(height));
  svg.setAttribute('aria-hidden', 'true');

  const shape = (d: string, cls = 'belt-stroke'): SVGPathElement => {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', fill);
    path.setAttribute('class', cls);
    svg.append(path);
    return path;
  };
  const line = (d: string, cls: string): void => {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('class', cls);
    svg.append(path);
  };

  // The band, with the two stitch lines every real belt carries.
  shape('M1 5 H47 V13 H1 Z');
  line('M3 7.3 H45 M3 10.7 H45', 'belt-stitch');
  // Tails hang from the knot; the right one sits behind the left.
  shape('M23 12.5 L29.5 21 L34.5 21 L27.5 12.5 Z');
  shape('M20.5 12.5 L13.5 21 L18.5 21 L25 12.5 Z');
  // The knot, and the fold where the band wraps over itself.
  shape('M19.5 3.5 H28.5 V14.5 H19.5 Z');
  line('M19.5 3.5 L28.5 14.5', 'belt-fold');

  if (l === 6) {
    const tag = document.createElementNS(SVG, 'text');
    tag.setAttribute('x', '38.5');
    tag.setAttribute('y', '10.9');
    tag.setAttribute('class', 'belt-dan');
    tag.textContent = 'DAN';
    svg.append(tag);
  }

  const wrap = document.createElement('span');
  wrap.className = 'belt-glyph';
  wrap.append(svg);
  return wrap;
}

/** A solid round pip with a dark rim — legible at sizes facets are not. */
function pip(size: number, hue: number): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  const dot = document.createElementNS(SVG, 'circle');
  dot.setAttribute('cx', '10');
  dot.setAttribute('cy', '10');
  dot.setAttribute('r', '7.4');
  dot.setAttribute('fill', `hsl(${hue} 72% 52%)`);
  dot.setAttribute('stroke', `hsl(${hue} 66% 30%)`);
  dot.setAttribute('stroke-width', '2.4');
  svg.append(dot);
  return svg;
}

/**
 * The rules-complexity scale wears round pips where the level ladder wears
 * stars — same colours, different shape, so the two axes cannot be mistaken
 * for each other anywhere they appear.
 */
export function pips(count: number, size = 20): HTMLSpanElement {
  const wrap = document.createElement('span');
  wrap.className = 'stars';
  const hue = hueFor(count);
  for (let i = 0; i < count; i++) wrap.append(pip(size, hue));
  return wrap;
}
