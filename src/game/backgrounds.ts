/**
 * Backgrounds behind the playing board. The presets are drawn here as SVG
 * rather than shipped as images: crisp at any size, themed to the DanDoku
 * dojo, and nothing to download — the app stays offline-first. A player's
 * own photo is downscaled on upload and kept on the device.
 */

import type { Settings } from './storage.ts';

export interface BackgroundPreset {
  id: string;
  name: string;
  /** The image, as a CSS `url(...)`-ready data URI. */
  image: string;
}

const svgUri = (width: number, height: number, body: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
  )}`;

/** Deterministic randomness, so a preset looks the same on every device. */
const seeded = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Seigaiha — the blue wave scales, the classic of Japanese pattern. */
function seigaiha(): string {
  const arcs = (cx: number, cy: number): string =>
    [18, 14, 10, 6, 2]
      .map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#dbe8ee" stroke-width="1.6"/>`)
      .join('');
  return svgUri(
    800,
    600,
    `<defs><pattern id="p" width="40" height="20" patternUnits="userSpaceOnUse">
      <rect width="40" height="20" fill="#3979a8"/>
      <circle cx="20" cy="20" r="20" fill="#3979a8"/>${arcs(20, 20)}
      <circle cx="0" cy="10" r="20" fill="#3979a8"/>${arcs(0, 10)}
      <circle cx="40" cy="10" r="20" fill="#3979a8"/>${arcs(40, 10)}
    </pattern></defs><rect width="800" height="600" fill="url(#p)"/>`,
  );
}

/** Shippō — the seven treasures: interlocking circles, ink on paper. */
function shippo(): string {
  const ring = (cx: number, cy: number): string =>
    `<circle cx="${cx}" cy="${cy}" r="20" fill="none" stroke="#17273d" stroke-width="1.4" opacity="0.55"/>`;
  return svgUri(
    800,
    600,
    `<defs><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#f4efe5"/>
      ${ring(20, 20)}${ring(0, 0)}${ring(40, 0)}${ring(0, 40)}${ring(40, 40)}
    </pattern></defs><rect width="800" height="600" fill="url(#p)"/>`,
  );
}

/** Tatami — woven straw mats with their dark cloth seams. */
function tatami(): string {
  return svgUri(
    800,
    600,
    `<defs>
      <pattern id="w" width="6" height="4" patternUnits="userSpaceOnUse">
        <rect width="6" height="4" fill="#cbb982"/>
        <rect width="6" height="1" y="0" fill="#bda96f"/>
        <rect width="3" height="1" y="2" fill="#d8c893"/>
      </pattern>
      <pattern id="s" width="200" height="300" patternUnits="userSpaceOnUse">
        <rect width="200" height="300" fill="url(#w)"/>
        <rect x="0" y="0" width="4" height="300" fill="#2b3a2f"/>
        <rect x="0" y="0" width="200" height="4" fill="#2b3a2f"/>
      </pattern>
    </defs><rect width="800" height="600" fill="url(#s)"/>`,
  );
}

/** Washi — rice paper: warm stock with stray fibres pressed into it. */
function washi(): string {
  const rnd = seeded(7);
  let fibres = '';
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 800;
    const y = rnd() * 600;
    const len = 12 + rnd() * 60;
    const a = rnd() * Math.PI;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    const o = 0.08 + rnd() * 0.18;
    fibres += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${((x + x2) / 2 + (rnd() - 0.5) * 12).toFixed(1)} ${((y + y2) / 2 + (rnd() - 0.5) * 12).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#8a7d62" stroke-width="${(0.6 + rnd() * 1.2).toFixed(1)}" opacity="${o.toFixed(2)}"/>`;
  }
  return svgUri(800, 600, `<rect width="800" height="600" fill="#f1ead9"/>${fibres}`);
}

/** Sumi — ink wash: deep navy with broad, half-dry brush sweeps. */
function sumi(): string {
  const rnd = seeded(3);
  let strokes = '';
  for (let i = 0; i < 7; i++) {
    const y = 40 + rnd() * 520;
    const x1 = -60 + rnd() * 200;
    const x2 = 600 + rnd() * 260;
    const bow = (rnd() - 0.5) * 180;
    strokes += `<path d="M${x1.toFixed(0)} ${y.toFixed(0)} Q400 ${(y + bow).toFixed(0)} ${x2.toFixed(0)} ${(y + (rnd() - 0.5) * 60).toFixed(0)}" fill="none" stroke="#f4efe5" stroke-width="${(18 + rnd() * 34).toFixed(0)}" stroke-linecap="round" opacity="${(0.05 + rnd() * 0.08).toFixed(2)}"/>`;
  }
  return svgUri(
    800,
    600,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2d44"/><stop offset="1" stop-color="#0e1826"/></linearGradient></defs>
    <rect width="800" height="600" fill="url(#g)"/>${strokes}`,
  );
}

/** Obi — the six belts as broad diagonal bands. */
function belts(): string {
  const colours = ['#fffdfa', '#efc44f', '#6c9a72', '#3979a8', '#8a563b', '#17273d'];
  const bands = colours
    .map((c, i) => `<rect x="${-300 + i * 220}" y="-400" width="220" height="1400" fill="${c}"/>`)
    .join('');
  return svgUri(
    800,
    600,
    `<rect width="800" height="600" fill="#17273d"/><g transform="rotate(-28 400 300)">${bands}</g>`,
  );
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'seigaiha', name: 'Seigaiha', image: seigaiha() },
  { id: 'shippo', name: 'Shippō', image: shippo() },
  { id: 'tatami', name: 'Tatami', image: tatami() },
  { id: 'washi', name: 'Washi', image: washi() },
  { id: 'sumi', name: 'Sumi', image: sumi() },
  { id: 'belts', name: 'Obi', image: belts() },
];

// ---------------------------------------------------------------- own photo

const CUSTOM_KEY = 'sv:v1:background';

export function loadCustomBackground(): string | null {
  try {
    return localStorage.getItem(CUSTOM_KEY);
  } catch {
    return null;
  }
}

export function clearCustomBackground(): void {
  try {
    localStorage.removeItem(CUSTOM_KEY);
  } catch {
    // Nothing to clear, or nowhere to clear it from.
  }
}

/** Longest side a stored photo is allowed; plenty for a phone screen. */
const MAX_SIDE = 1600;

/**
 * Downscale a chosen image and keep it on the device. A camera photo runs
 * to many megabytes; at 1600px and JPEG quality 0.82 it is a few hundred
 * kilobytes, which sits comfortably inside localStorage. Resolves false if
 * storage refused it — private browsing, or a full quota.
 */
export async function storeCustomBackground(file: File): Promise<boolean> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  try {
    localStorage.setItem(CUSTOM_KEY, dataUrl);
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ applying

/** The image for the current setting, or null for a plain page. */
export function backgroundImage(settings: Settings): string | null {
  if (settings.background === 'none') return null;
  if (settings.background === 'custom') return loadCustomBackground();
  return BACKGROUND_PRESETS.find((p) => p.id === settings.background)?.image ?? null;
}

/** Put the chosen image behind the page, or take it away. */
export function applyBackground(settings: Settings): void {
  const image = backgroundImage(settings);
  if (image === null) {
    clearBackground();
    return;
  }
  document.body.style.setProperty('--bg-image', `url("${image}")`);
  document.body.style.setProperty('--bg-dim', String(settings.backgroundDim));
  document.body.classList.add('has-bg');
}

export function clearBackground(): void {
  document.body.classList.remove('has-bg');
  document.body.style.removeProperty('--bg-image');
  document.body.style.removeProperty('--bg-dim');
}
