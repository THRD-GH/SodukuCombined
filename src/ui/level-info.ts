import { LEVEL_NAMES } from '../core/generator.ts';
import type { Level } from '../core/types.ts';
import { el } from './dom.ts';
import { openOverlay } from './overlay.ts';
import { stars } from './stars.ts';

const LEVEL_GUIDE: Record<Level, { lead: string; techniques: string[] }> = {
  1: {
    lead: 'Direct logic only, on a well-populated board.',
    techniques: ['Naked singles', 'Hidden singles in any row, column, region or variant group'],
  },
  2: {
    lead: 'Adds reasoning about where a digit is pinned down.',
    techniques: ['Locked candidates between overlapping groups', 'With variants on, the same rule runs on diagonals, windows and colours'],
  },
  3: {
    lead: 'Small groups of candidates that work together.',
    techniques: ['Naked pairs and triples', 'Hidden pairs and triples'],
  },
  4: {
    lead: 'Uses the deepest named technique in the solver.',
    techniques: ['X-wing patterns', 'Everything from the levels below, worked harder'],
  },
  5: {
    lead: 'Extends beyond the named technique stack.',
    techniques: ['All techniques from earlier levels', 'Occasional what-if reasoning for the remaining cells'],
  },
  6: {
    lead: 'The most resistant grids the generator can dig.',
    techniques: ['All techniques from earlier levels', 'Sustained what-if reasoning for the remaining cells'],
  },
};

export function openLevelInfo(level: Level): void {
  const guide = LEVEL_GUIDE[level];
  openOverlay((close) => {
    const list = el('ul', { class: 'level-techniques' });
    for (const technique of guide.techniques) list.append(el('li', {}, technique));
    const done = el('button', { class: 'btn primary wide' }, 'Got it');
    done.addEventListener('click', close);
    return el(
      'div',
      { class: 'panel level-info-panel' },
      el('div', { class: 'level-info-stars' }, stars(level, 15)),
      el('h2', {}, `Level ${level} · ${LEVEL_NAMES[level]}`),
      el('p', { class: 'level-info-lead' }, guide.lead),
      list,
      level > 1
        ? el('p', { class: 'summary' }, 'Each level can also require techniques introduced below it. The rating reflects the hardest step needed.')
        : null,
      el('div', { class: 'panel-footer' }, done),
    );
  });
}
