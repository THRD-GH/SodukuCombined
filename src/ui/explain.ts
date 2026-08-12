import type { Step } from '../core/techniques.ts';

/** R4C2 — the usual way of naming a cell out loud. */
export const cellName = (index: number): string =>
  `R${Math.floor(index / 9) + 1}C${(index % 9) + 1}`;

const TITLES: Record<string, string> = {
  'naked single': 'Naked single',
  'hidden single': 'Hidden single',
  'locked candidates': 'Locked candidates',
  'naked subset': 'Naked pair or triple',
  'hidden subset': 'Hidden pair or triple',
  'naked quad': 'Naked quad',
  'hidden quad': 'Hidden quad',
  'x-wing': 'X-wing',
  'xy-wing': 'XY-wing',
  'xyz-wing': 'XYZ-wing',
  swordfish: 'Swordfish',
  'turbot fish': 'Turbot fish',
  'w-wing': 'W-wing',
  jellyfish: 'Jellyfish',
};

export const describeTechnique = (technique: string): string => TITLES[technique] ?? technique;

/**
 * Why each step works, in the terms a player would use. "Group" is spelled
 * out as the row, column, region or variant unit it might be — with variants
 * in play the same reasoning runs on diagonals, windows and colour groups.
 * These lines serve the hints, the win screen and the technique guide alike.
 */
const REASONS: Record<string, string> = {
  'naked single':
    'Everything this cell can see rules out its other digits, so only one candidate is left in it.',
  'hidden single':
    'Only one cell in that row, column, region, diagonal, window or colour group can still take this digit, so that is where it goes.',
  'locked candidates':
    'Where two groups overlap, every place the digit can go in one of them falls inside the overlap — so the digit is certainly there, and leaves the rest of the other group.',
  'naked subset':
    'Two or three cells in one group share only the same two or three candidates between them, so those digits are spoken for and leave the other cells.',
  'hidden subset':
    'Two or three digits in one group can only go in the same two or three cells, so nothing else can go in them.',
  'naked quad':
    'Four cells in one group share only the same four candidates between them, so those digits are spoken for and leave the other cells.',
  'hidden quad':
    'Four digits in one group can only go in the same four cells, so nothing else can go in them.',
  'x-wing':
    'A digit is limited to the same two columns in two different rows (or the other way round), so in those columns it must lie on those rows — and comes out of the others.',
  'xy-wing':
    'A cell with two candidates leans on two pincer cells it can see, each sharing one of them plus a common third digit. Whichever way the pivot falls, one pincer holds that third digit — so it leaves every cell that sees both pincers.',
  'xyz-wing':
    'Like an XY-wing, but the pivot holds all three digits. Every way the three cells can resolve puts the shared digit in one of them, so it leaves the cells that see all three.',
  swordfish:
    'A digit is confined to the same three columns across three rows (or the other way round). Those three columns are then spoken for on those rows, and the digit comes out of the rest of them.',
  'turbot fish':
    'Two groups each hold this digit in exactly two places, and one end of each pair can see the other. One of the two far ends must be the digit, so it leaves every cell that sees them both. Skyscrapers and two-string kites are this same shape.',
  'w-wing':
    'Two cells hold the same two candidates and are joined through a group where one of those digits has only two places, one seeing each cell. That digit cannot vanish from the joining group, so one end always carries it — and the other digit leaves every cell seeing both ends.',
  jellyfish:
    'A digit is confined to the same four columns across four rows (or the other way round) — the four-line fish. Those columns are spoken for, and the digit comes out of the rest of them.',
};

export const explainTechnique = (technique: string): string =>
  REASONS[technique] ?? 'This narrows the candidates.';

export function explainStep(step: Step): string {
  const reason = explainTechnique(step.technique);
  if (step.solved) {
    const { cell, digit } = step.solved;
    return `${cellName(cell)} must be ${digit}. ${reason}`;
  }
  const count = step.cells.length;
  return `${reason} It rules candidates out of ${count} cell${count === 1 ? '' : 's'}.`;
}
