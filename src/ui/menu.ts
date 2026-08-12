import { LEVELS, LEVEL_NAMES } from '../core/generator.ts';
import type { Level, Variants } from '../core/types.ts';
import { VARIANT_NAMES, formatPuzzleId, variantLabel } from '../core/types.ts';
import { allSaves, levelStats, saveSettings, unplayedNumbers } from '../game/storage.ts';
import { buildStamp, clear, el, formatTime } from './dom.ts';
import { openOverlay, toast } from './overlay.ts';
import { bindTap } from './pointer.ts';
import { stars } from './stars.ts';
import type { AppContext } from './app-context.ts';
import { openActionMenu } from './action-menu.ts';
import { openLevelInfo } from './level-info.ts';
import { openUnfinishedPicker } from './unfinished-picker.ts';
import { openTutorial } from './tutorial.ts';

/**
 * The menu: pick a variant combination, then a level. The four variant chips
 * toggle freely — any mix is a playable pool with its own numbering, history
 * and stats, which is the whole point of the game. The chosen mix is kept in
 * settings so the menu opens where you left it.
 */
export function buildMenu(ctx: AppContext): HTMLElement {
  const screen = el('div', { class: 'screen' });

  const menuBtn = el('button', { class: 'iconbtn', 'aria-label': 'Menu' });
  menuBtn.append(el('i'), el('i'), el('i'));
  menuBtn.addEventListener('click', () => openMainMenu(ctx));

  screen.append(
    el('div', { class: 'titlebar' }, menuBtn, el('span', { class: 'id' }, 'SUDOKU')),
    el(
      'div',
      { class: 'hero' },
      el('h1', {}, 'Choose your ', el('span', {}, 'Game')),
      el('p', {}, 'Mix the variants, pick a difficulty'),
    ),
  );

  // ------------------------------------------------------------ variant chips
  const comboLabel = el('p', { class: 'combo-label' });
  const chipRow = el('div', { class: 'variant-chips', role: 'group', 'aria-label': 'Variants' });
  const levelList = el('div', { class: 'levels' });

  const describe: Record<keyof Variants, string> = {
    x: 'both main diagonals hold 1-9',
    jigsaw: 'irregular regions replace the boxes',
    hyper: 'four extra shaded boxes',
    colour: 'nine colour groups each hold 1-9',
  };

  const redrawLevels = (): void => {
    comboLabel.textContent = variantLabel(ctx.settings.variants);
    clear(levelList);
    for (const level of LEVELS) levelList.append(buildLevelPanel(ctx, level));
  };

  for (const key of Object.keys(VARIANT_NAMES) as (keyof Variants)[]) {
    const chip = el(
      'button',
      {
        class: 'chip',
        role: 'switch',
        title: describe[key],
        'aria-label': `${VARIANT_NAMES[key]} — ${describe[key]}`,
      },
      VARIANT_NAMES[key],
    );
    const sync = (): void => {
      chip.classList.toggle('on', ctx.settings.variants[key]);
      chip.setAttribute('aria-checked', String(ctx.settings.variants[key]));
    };
    chip.addEventListener('click', () => {
      ctx.settings.variants[key] = !ctx.settings.variants[key];
      saveSettings(ctx.settings);
      sync();
      redrawLevels();
    });
    sync();
    chipRow.append(chip);
  }
  screen.append(chipRow, comboLabel);

  // ---------------------------------------------------------------- resume
  const resumeBtn = el('button', { class: 'btn primary wide' });
  const resumeActions = el('div', { class: 'actions' }, resumeBtn);
  const refreshResume = (): void => {
    const saves = allSaves();
    resumeActions.hidden = saves.length === 0;
    resumeBtn.textContent =
      saves.length === 1
        ? `Resume ${formatPuzzleId(saves[0].id)}`
        : `${saves.length} unfinished games`;
  };
  resumeBtn.addEventListener('click', () => {
    const saves = allSaves();
    if (saves.length === 1) ctx.playPuzzle(saves[0].id);
    else if (saves.length > 1) openUnfinishedPicker(ctx, refreshResume);
  });
  refreshResume();
  screen.append(resumeActions);

  screen.append(levelList);
  redrawLevels();

  screen.append(
    el(
      'p',
      { class: 'hint-line' },
      'Each puzzle number creates the same grid on every device, for any mix of variants.',
    ),
    el('p', { class: 'build-stamp' }, buildStamp()),
  );
  return screen;
}

/** One level: the difficulty head, then its pool for the current variants. */
function buildLevelPanel(ctx: AppContext, level: Level): HTMLElement {
  const variants: Variants = { ...ctx.settings.variants };
  const row = el(
    'div',
    { class: 'level' },
    el(
      'button',
      {
        class: 'level-head',
        'aria-label': `Explain level ${level}, ${LEVEL_NAMES[level]}`,
        title: `What level ${level} involves`,
      },
      stars(level, 10),
      el('span', { class: 'name' }, LEVEL_NAMES[level]),
      el('span', { class: 'level-info-badge', 'aria-hidden': 'true' }, '?'),
    ),
  );

  const levelHead = row.querySelector<HTMLButtonElement>('.level-head');
  levelHead?.addEventListener('click', () => openLevelInfo(level));

  const size = ctx.poolSize;
  const left = unplayedNumbers(ctx.history, variants, level, size).length;
  const stat = levelStats(ctx.history, variants, level, size);
  const button = el(
    'button',
    { class: 'source new' },
    el('span', { class: 'source-name' }, 'Play'),
    el(
      'span',
      { class: 'source-meta' },
      `${left} left${stat.averageMs === null ? '' : ` · ${formatTime(stat.averageMs)}`}`,
    ),
  );
  bindTap(button, {
    onTap: () => ctx.playRandom(variants, level),
    onLong: () => openPicker(ctx, variants, level),
  });

  // Picking a specific puzzle used to need a long-press, which nobody finds
  // on a phone. It gets its own button.
  const pick = el('button', {
    class: 'pick',
    title: 'Choose a puzzle number',
    'aria-label': `Choose puzzle number for level ${level}`,
  });
  pick.textContent = '#';
  pick.addEventListener('click', () => openPicker(ctx, variants, level));

  row.append(el('div', { class: 'source-row' }, button, pick));
  return row;
}

/** Puzzle numbers per range tab. */
const RANGE_SIZE = 100;

/**
 * The list of puzzle numbers not yet played in this pool, in ranges so the
 * panel is not a wall of buttons, with a box for going straight to a number.
 */
export function openPicker(ctx: AppContext, variants: Variants, level: Level): void {
  const size = ctx.poolSize;
  const available = new Set(unplayedNumbers(ctx.history, variants, level, size));

  openOverlay((close) => {
    const play = (n: number): void => {
      close();
      ctx.playPuzzle({ variants, level, number: n });
    };

    const ranges: { from: number; to: number; free: number }[] = [];
    for (let from = 1; from <= size; from += RANGE_SIZE) {
      const to = Math.min(from + RANGE_SIZE - 1, size);
      let free = 0;
      for (let n = from; n <= to; n++) if (available.has(n)) free++;
      ranges.push({ from, to, free });
    }
    // Open on the first range that still has something to play.
    let current = Math.max(0, ranges.findIndex((r) => r.free > 0));

    const tabs = el('div', { class: 'picker-ranges' });
    const grid = el('div', { class: 'picker' });
    const summary = el('p', { class: 'summary' });

    const draw = (): void => {
      clear(tabs);
      if (ranges.length > 1) {
        for (const [i, range] of ranges.entries()) {
          const tab = el(
            'button',
            { class: `btn ${i === current ? 'on' : ''}`.trim(), disabled: range.free === 0 },
            `${range.from}–${range.to}`,
          );
          tab.addEventListener('click', () => {
            current = i;
            draw();
          });
          tabs.append(tab);
        }
      }

      const range = ranges[current];
      clear(grid);
      let shown = 0;
      for (let n = range.from; n <= range.to; n++) {
        if (!available.has(n)) continue;
        shown++;
        const b = el('button', { class: 'btn' }, formatPuzzleId({ variants, level, number: n }));
        b.addEventListener('click', () => play(n));
        grid.append(b);
      }
      if (shown === 0) {
        grid.append(
          el('p', { class: 'summary' }, 'Nothing left here. Release some in Stats, or try another range.'),
        );
      }

      summary.textContent =
        available.size === 0
          ? 'Every puzzle here has been played. Release some in Stats.'
          : `${available.size} of ${size} available` +
            (ranges.length > 1 ? ` · showing ${range.from}–${range.to}` : '');
    };

    // Straight to a number, for when you already know which one you want.
    const jump = el('input', {
      type: 'number',
      min: 1,
      max: size,
      inputmode: 'numeric',
      placeholder: 'no.',
      'aria-label': 'Go to puzzle number',
    });
    const go = el('button', { class: 'btn' }, 'Go');
    const goTo = (): void => {
      const n = Number(jump.value);
      if (!Number.isInteger(n) || n < 1 || n > size) {
        toast(`Pick a number between 1 and ${size}`);
        return;
      }
      if (!available.has(n)) {
        toast(`${formatPuzzleId({ variants, level, number: n })} has been played — release it in Stats`);
        return;
      }
      play(n);
    };
    go.addEventListener('click', goTo);
    jump.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') goTo();
    });

    const cancel = el('button', { class: 'btn wide' }, 'Cancel');
    cancel.addEventListener('click', close);

    draw();
    return el(
      'div',
      { class: 'panel' },
      el('h2', {}, `${variantLabel(variants)} · Level ${level} — ${LEVEL_NAMES[level]}`),
      el('div', { class: 'picker-jump' }, el('label', {}, 'Go to'), jump, go),
      tabs,
      summary,
      grid,
      el('div', { class: 'panel-footer' }, cancel),
    );
  });
}

export function openMainMenu(ctx: AppContext): void {
  openActionMenu('Menu', [
    { label: 'How to play walkthrough', run: () => openTutorial() },
    { label: 'Settings', run: () => ctx.openSettings() },
    { label: 'Stats', run: () => ctx.goStats(1) },
    { label: 'Help', run: () => ctx.openHelp() },
    { label: 'About', run: () => toast('Sudoku Variants — a personal build') },
  ]);
}
