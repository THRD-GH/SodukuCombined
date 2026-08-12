import { LEVEL_NAMES } from '../core/generator.ts';
import { TECHNIQUES } from '../core/techniques.ts';
import type { Level } from '../core/types.ts';
import { clear, el } from './dom.ts';
import { openOverlay } from './overlay.ts';
import { stars } from './stars.ts';
import { describeTechnique, explainTechnique } from './explain.ts';
import { techniqueExample } from './technique-examples.ts';
import { LEVEL_LEADS } from './level-info.ts';

/**
 * The technique walkthrough: one page per technique, in the order the level
 * ladder introduces them, each with its worked example board. One page per
 * *technique*, not per level, deliberately — a page holds one name, one
 * explanation and one diagram, which fits a phone screen whole instead of
 * turning the panel into a scrolling box.
 *
 * The content is read straight off the solver's stack, so the guide can
 * never drift from what the generator actually demands — and because every
 * level is dug under its technique cap, the guide is also a promise:
 * nothing beyond what is written here is ever needed.
 */
export function openTechniqueGuide(): void {
  // Already ordered easiest-first; keep only the named, teachable steps.
  const pages = TECHNIQUES;

  openOverlay((close) => {
    let current = 0;

    const header = el('div', { class: 'guide-header' });
    const card = el('div', { class: 'guide-technique' });
    const progress = el('p', { class: 'guide-progress' });
    const back = el('button', { class: 'btn' }, 'Back');
    const next = el('button', { class: 'btn primary' });

    const draw = (): void => {
      const t = pages[current];
      const level = Math.min(6, t.difficulty) as Level;

      clear(header);
      header.append(
        stars(level, 12),
        el('span', { class: 'guide-level' }, `Level ${level} · ${LEVEL_NAMES[level]}`),
      );

      clear(card);
      card.append(el('b', {}, describeTechnique(t.name)), el('p', {}, explainTechnique(t.name)));
      const example = techniqueExample(t.name);
      if (example) card.append(example);

      const intro = current === 0 || pages[current - 1].difficulty !== t.difficulty;
      progress.textContent =
        `${current + 1} of ${pages.length}` + (intro ? ` — ${LEVEL_LEADS[level]}` : '');

      back.disabled = current === 0;
      next.textContent = current === pages.length - 1 ? 'Done' : 'Next';
    };

    back.addEventListener('click', () => {
      if (current > 0) current--;
      draw();
    });
    next.addEventListener('click', () => {
      if (current === pages.length - 1) close();
      else {
        current++;
        draw();
      }
    });

    draw();
    return el(
      'div',
      { class: 'panel guide' },
      el('div', { class: 'eyebrow' }, 'TECHNIQUE GUIDE'),
      header,
      card,
      progress,
      el('div', { class: 'tutorial-actions' }, back, next),
    );
  });
}
