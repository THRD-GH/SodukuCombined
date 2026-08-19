import { LEVEL_NAMES, LEVEL_RANKS, LEVEL_WORDS } from '../core/generator.ts';
import { TECHNIQUES } from '../core/techniques.ts';
import type { Level } from '../core/types.ts';
import { el } from './dom.ts';
import { openOverlay } from './overlay.ts';
import { belt } from './stars.ts';
import { describeTechnique } from './explain.ts';

export const LEVEL_LEADS: Record<Level, string> = {
  1: 'Direct logic only, on a well-populated board.',
  2: 'Adds reasoning about where a digit is pinned down.',
  3: 'Small groups of candidates that work together.',
  4: 'Bigger groups, and the first of the fish.',
  5: 'Wings and the three-line fish.',
  6: 'The deepest named techniques in the solver.',
};

/** Techniques a level introduces — read straight off the solver's stack. */
export const levelTechniques = (level: Level): string[] =>
  TECHNIQUES.filter((t) => t.difficulty === level).map((t) => describeTechnique(t.name));

export function openLevelInfo(level: Level): void {
  openOverlay((close) => {
    const list = el('ul', { class: 'level-techniques' });
    for (const technique of levelTechniques(level)) list.append(el('li', {}, technique));
    const done = el('button', { class: 'btn primary wide' }, 'Got it');
    done.addEventListener('click', close);
    return el(
      'div',
      { class: 'panel level-info-panel' },
      el('div', { class: 'level-info-stars' }, belt(level, 18)),
      el('h2', {}, `${LEVEL_NAMES[level]} · ${LEVEL_RANKS[level]}`),
      el('p', { class: 'level-info-lead' }, `${LEVEL_WORDS[level]}. ${LEVEL_LEADS[level]}`),
      list,
      level > 1
        ? el('p', { class: 'summary' }, 'Each belt can also require every technique introduced below it. The rating reflects the hardest step needed, and every puzzle is solvable by these techniques alone — no guessing.')
        : null,
      el('div', { class: 'panel-footer' }, done),
    );
  });
}
