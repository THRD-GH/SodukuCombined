import { el } from './dom.ts';
import { openOverlay } from './overlay.ts';

const SECTIONS: [string, string[]][] = [
  [
    'Rules',
    [
      'Normal sudoku rules: 1–9 once per row, column and region.',
      'The given digits are printed in; they cannot be changed.',
      'Variants add extra groups that must also hold 1–9 each, on top of the normal rules.',
    ],
  ],
  [
    'Variants',
    [
      'X — both main diagonals hold 1–9. They are drawn as lines across the board.',
      'Percent — the % shape: the anti-diagonal and two shaded windows each hold 1–9.',
      'Jigsaw — the nine 3×3 boxes are replaced by nine irregular regions, traced by the thick borders.',
      'Hyper — four extra shaded 3×3 boxes, at rows/columns 2–4 and 6–8, each hold 1–9.',
      'Colour — the cells are painted in nine colours, and each colour holds 1–9.',
      'Any mix of variants can be on at once; every rule in play applies together. The peer highlight always shows exactly what the selected cell can see.',
    ],
  ],
  [
    'Entering digits',
    [
      'Tap a cell to select it.',
      'Tap the keypad to put a digit in that cell. Two or more digits in a cell are candidates (pencil marks).',
      'Tap a candidate again to take it out.',
      'Long-click or double-click a keypad digit to force it in as the answer, clearing any candidates.',
      'Forcing an answer that way also strikes that digit from the pencil marks of everything the cell sees — including diagonals, windows and colour groups when they are in play. A plain tap never does. One undo takes back the answer and those candidates together. Turn it off with “Tidy candidates automatically”.',
      'Long-click or double-click CLEAR — or long-click the cell itself — to empty it.',
      'Tap a digit key with no cell selected to light up every placed copy of that digit — tap it again to clear. The title bar names the variant rules in play.',
    ],
  ],
  [
    'Buttons',
    [
      'Check — mark entries that disagree with the solution.',
      'Hint — explain the next logical step, and offer to make it.',
      'Marks — pencil in every candidate the rules still allow.',
      'Restart — clear the grid and start the same puzzle again.',
      'New — leave for a fresh puzzle at the same level and variants.',
      'Undo and redo — the two arrow buttons. Undo winds back move by move, as far as the starting grid. Redo goes forward again, until you make a new move, which abandons it.',
      'Pause — stop the clock.',
      'The white box is the clock. Tap it to hide or show the time; it keeps running.',
    ],
  ],
  [
    'Keyboard',
    [
      'Arrow keys move, 1–9 enter a digit, Shift+digit forces an answer.',
      'Backspace clears, Z undoes, H hints, C checks, M fills marks, Escape pauses.',
    ],
  ],
  [
    'Pausing',
    [
      'Press Pause, or long-click any cell. Long-click the pause screen (or press Escape) to continue.',
      'The game also pauses when you switch away from the tab.',
    ],
  ],
  [
    'Levels and puzzle numbers',
    [
      'Six levels, one to six stars. Every variant mix has its own pool of numbered puzzles at each level.',
      'Tap Play for a random unplayed puzzle, hold (or tap #) to choose a number.',
      'Puzzle S3-10 is plain sudoku, X3-10 has the diagonals on, XJ3-10 adds jigsaw, and so on. The same id always builds the same puzzle on every device.',
      'Each pool keeps separate history. Only unplayed puzzles are offered — release used ones from Stats by long-clicking a pink row.',
    ],
  ],
  [
    'Stats',
    [
      'The totals and unfinished list cover everything; the per-level rows show the pool for the variant mix currently chosen on the menu.',
      'Each row shows your best time, the date you set it, and the hints and checks it took.',
      'Pink rows are used up; green rows have been released back into the pool.',
      '“Unfinished games” lists every puzzle you started and never solved, with the one you touched most recently at the top. Hold one to pick it up, exactly where you left it.',
    ],
  ],
];

export function openHelp(): void {
  openOverlay((close) => {
    const panel = el('div', { class: 'panel' }, el('h2', {}, 'How to play'));
    for (const [title, lines] of SECTIONS) {
      panel.append(el('h3', {}, title));
      const ul = el('ul', { style: 'margin: 0; padding-left: 18px' });
      for (const line of lines) ul.append(el('li', {}, line));
      panel.append(ul);
    }
    const done = el('button', { class: 'btn primary' }, 'Close');
    done.addEventListener('click', close);
    panel.append(el('div', { class: 'panel-footer' }, done));
    return panel;
  });
}
