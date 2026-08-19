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
 * One belt, drawn as the thing itself: the band, a square knot, two tails.
 * Rank is said by colour, not by count — a blue belt is one blue belt — so
 * this replaces the star rows wherever difficulty is shown. The border
 * comes from a theme variable so White reads on cream and Black on night.
 */
export function belt(level: number, height = 14): HTMLSpanElement {
  const l = Math.min(Math.max(Math.round(level), 1), 6);
  const fill = BELT_COLOURS[l - 1];

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 44 20');
  svg.setAttribute('width', String(Math.round((height * 44) / 20)));
  svg.setAttribute('height', String(height));
  svg.setAttribute('aria-hidden', 'true');

  const shape = (d: string): SVGPathElement => {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', fill);
    path.setAttribute('class', 'belt-stroke');
    svg.append(path);
    return path;
  };

  // Band, then the two tails falling from the knot, then the knot on top.
  shape('M1.5 5.5 H42.5 V12.5 H1.5 Z');
  shape('M20 11 L14.5 18.5 L18.5 18.5 L23 11 Z');
  shape('M24 11 L27.5 18.5 L31.5 18.5 L27 11 Z');
  shape('M18.5 4.5 L25.5 4.5 L28 13.2 L21 13.2 Z');

  if (l === 6) {
    const tag = document.createElementNS(SVG, 'text');
    tag.setAttribute('x', '35');
    tag.setAttribute('y', '10.6');
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
