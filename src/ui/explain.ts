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
  'x-wing': 'X-wing',
};

export const describeTechnique = (technique: string): string => TITLES[technique] ?? technique;

/**
 * Why the step works, in the terms a player would use. "Unit" is spelled out
 * as the row, column, region or variant group it might be — with variants in
 * play the same reasoning runs on diagonals, windows and colour groups.
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
  'x-wing':
    'A digit is limited to the same two columns in two different rows, so in those columns it must lie on those rows — and comes out of the others.',
};

export function explainStep(step: Step): string {
  const reason = REASONS[step.technique] ?? 'This narrows the candidates.';
  if (step.solved) {
    const { cell, digit } = step.solved;
    return `${cellName(cell)} must be ${digit}. ${reason}`;
  }
  const count = step.cells.length;
  return `${reason} It rules candidates out of ${count} cell${count === 1 ? '' : 's'}.`;
}
