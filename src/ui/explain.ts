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

/**
 * The teaching version, for the technique guide: what to look for, why the
 * logic is forced, and what it lets you cross off. The hints keep the short
 * REASONS above — a hint interrupts play, a lesson is the point of the page.
 */
const LESSONS: Record<string, string> = {
  'naked single':
    'Cross off everything a cell can see: every digit already placed in its row, column, region, or any variant group it belongs to. When eight of the nine digits are crossed off, the one left is the answer — write it in.',
  'hidden single':
    'Pick a digit and a group, and ask: where can it still go? The digit must appear exactly once in that group. If every cell but one is blocked — it can see the digit elsewhere, or already holds something — the last cell must take it, even if that cell still lists other candidates.',
  'locked candidates':
    'Look where a digit can sit within one group, and notice that every possibility falls in cells it shares with a second group — a box crossing a row, a window crossing a column. The digit must land in that overlap to satisfy the first group, and that same cell then counts for the second — so cross it off everywhere else in the second group.',
  'naked subset':
    'Find two cells in a group holding exactly the same two candidates, say {3,8}. One will be 3 and the other 8 — you cannot say which way round, but both digits are spoken for. Cross 3 and 8 off every other cell in the group. Three cells sharing only three candidates work the same way.',
  'hidden subset':
    'Count homes: if two digits can only fit in the same two cells of a group — every other cell blocked for both — those cells must take those digits, whatever else they list. Everything else in those two cells can be crossed off. Three digits confined to three cells work the same way.',
  'naked quad':
    'The four-cell naked set: four cells in a group listing only four candidates between them. Those digits must share out one-per-cell, so all four leave every other cell in the group. Quads hide well because no single cell has to hold all four candidates — check what the cells list together.',
  'hidden quad':
    'Four digits whose only homes in a group are the same four cells. However they arrange themselves, those cells are fully spoken for, so their other candidates all go. Spot it by counting homes digit by digit — any digit down to a few places is worth the look.',
  'x-wing':
    'Pick a digit and find two rows where it has exactly two places left, lined up in the same two columns — a rectangle. Each row must use one of the two columns, and they cannot share, so between them both columns are used up. Cross the digit off everywhere else in both columns. Columns-to-rows works the same.',
  'xy-wing':
    'Three cells, each down to two candidates. A pivot {a,b} sees two pincers: {a,c} and {b,c}. If the pivot is a, the first pincer is forced to c; if b, the second is. One pincer is c either way — so a cell that sees both pincers can never be c.',
  'xyz-wing':
    'Like an XY-wing, but the pivot keeps all three digits {a,b,c}. Run the cases: pivot a forces the {a,c} pincer to c; pivot b forces the other; pivot c is c itself. Every case puts a c in the trio, so c leaves any cell that sees all three — which keeps the eliminations close to the pivot.',
  swordfish:
    'The three-line fish. One digit, three rows, and every place it can go in them falls in the same three columns. Each row claims a different one of those columns, so the three columns are fully accounted for — the digit comes out of them everywhere else. Rows with only two places count too, as long as they stay inside the three columns.',
  'turbot fish':
    'A strong link is a group where the digit has exactly two places: one empty means the other holds it. Take two strong links on one digit whose ends see each other in the middle. If the first far end is not the digit, the chain forces the second far end to be it. One far end is always the digit — so cells seeing both far ends never are. Skyscrapers and two-string kites are this shape.',
  'w-wing':
    'Two cells in different groups hold the same pair {a,b}, and somewhere a group has only two places for b — one seeing each cell. If neither of the pair were b, both of those places would be blocked and the linking group would lose b entirely, which cannot happen. So one of the pair is b, and a leaves every cell that sees both.',
  jellyfish:
    'The four-line fish: every place a digit can go in four rows falls in the same four columns. Each row claims its own column, all four columns are accounted for, and the digit disappears from the rest of them. The hunt is exactly an X-wing with bigger nets.',
};

export const explainTechniqueFully = (technique: string): string =>
  LESSONS[technique] ?? explainTechnique(technique);

export function explainStep(step: Step): string {
  const reason = explainTechnique(step.technique);
  if (step.solved) {
    const { cell, digit } = step.solved;
    return `${cellName(cell)} must be ${digit}. ${reason}`;
  }
  const count = step.cells.length;
  return `${reason} It rules candidates out of ${count} cell${count === 1 ? '' : 's'}.`;
}
