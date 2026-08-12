import { CELLS, bit, maskToDigit, popcount } from '../core/grid.ts';
import { buildGeometry } from '../core/geometry.ts';
import type { Geometry } from '../core/geometry.ts';
import { propagatedCandidates } from '../core/solver.ts';
import { nextStep } from '../core/techniques.ts';
import type { Step } from '../core/techniques.ts';
import type { Puzzle, PuzzleId } from '../core/types.ts';
import type { Settings } from './storage.ts';

interface CellDelta {
  index: number;
  value: number;
  pencil: number;
}

/** One user action, stored as the cells it replaced and what was in them. */
type Move = CellDelta[];

export class Game {
  readonly id: PuzzleId;
  readonly puzzle: Puzzle;
  readonly geometry: Geometry;
  /** Digit per cell, 0 when empty. Given cells hold their given digit. */
  values: number[];
  /** Candidate bitmask per cell. */
  pencils: number[];
  selected = -1;
  elapsedMs = 0;
  hints = 0;
  checks = 0;
  completed = false;
  /** Cells flagged wrong by the last [Check]. Cleared as soon as they change. */
  errors = new Set<number>();
  private history: Move[] = [];
  /** Moves taken back, waiting to be reapplied. Emptied by any fresh move. */
  private future: Move[] = [];

  constructor(id: PuzzleId, puzzle: Puzzle, restore?: { values: number[]; pencils: number[] }) {
    this.id = id;
    this.puzzle = puzzle;
    this.geometry = buildGeometry(puzzle.variants, puzzle.boxes, puzzle.colours);
    this.values = restore ? [...restore.values] : [...puzzle.givens];
    this.pencils = restore ? [...restore.pencils] : new Array<number>(CELLS).fill(0);
  }

  /** Given clues are the puzzle's own; they cannot be edited or cleared. */
  isGiven(index: number): boolean {
    return this.puzzle.givens[index] !== 0;
  }

  /**
   * Undo/redo flattened for storage: each move becomes a run of
   * index, value, pencil triples. Kept with the saved game so putting a
   * puzzle down and picking it up again does not cost you the history.
   */
  exportHistory(): { past: number[][]; future: number[][] } {
    const encode = (move: Move): number[] =>
      move.flatMap(({ index, value, pencil }) => [index, value, pencil]);
    return { past: this.history.map(encode), future: this.future.map(encode) };
  }

  importHistory(data: { past?: number[][]; future?: number[][] } | undefined): void {
    if (!data) return;
    const decode = (flat: number[]): Move => {
      const move: Move = [];
      for (let i = 0; i + 2 < flat.length; i += 3) {
        move.push({ index: flat[i], value: flat[i + 1], pencil: flat[i + 2] });
      }
      return move;
    };
    this.history = (data.past ?? []).map(decode);
    this.future = (data.future ?? []).map(decode);
  }

  get filledCount(): number {
    return this.values.reduce((n, v) => n + (v !== 0 ? 1 : 0), 0);
  }

  /** How many of `digit` are placed, so the numpad can grey out finished digits. */
  countOf(digit: number): number {
    return this.values.reduce((n, v) => n + (v === digit ? 1 : 0), 0);
  }

  private snapshot(indices: number[]): Move {
    return indices.map((index) => ({
      index,
      value: this.values[index],
      pencil: this.pencils[index],
    }));
  }

  /** Swap the recorded cells into the grid, returning what was there before. */
  private apply(move: Move): Move {
    const previous = this.snapshot(move.map((d) => d.index));
    for (const { index, value, pencil } of move) {
      this.values[index] = value;
      this.pencils[index] = pencil;
      this.errors.delete(index);
    }
    return previous;
  }

  private record(indices: number[]): void {
    this.history.push(this.snapshot(indices));
    // Branching off the undone line abandons it, as in any editor.
    this.future.length = 0;
    for (const i of indices) this.errors.delete(i);
  }

  /** Fold more cells into the move already in progress, so undo stays atomic. */
  private recordAlso(indices: number[]): void {
    const move = this.history[this.history.length - 1];
    if (!move) return;
    for (const index of indices) {
      if (move.some((d) => d.index === index)) continue;
      move.push({ index, value: this.values[index], pencil: this.pencils[index] });
      this.errors.delete(index);
    }
  }

  /**
   * Forcing an answer strikes that digit from the candidates of every peer —
   * and "peer" here already speaks the variant rules, because the peers come
   * off the puzzle's own geometry: the same row, column and region always,
   * plus a shared diagonal, window or colour when those are in play. Folded
   * into the current move: one undo puts the candidates back with the answer.
   *
   * Only the deliberate gestures do this — long-click and double-click. A
   * plain tap is far too easy to make by accident to be wiping candidates
   * across the grid.
   */
  private cleanPeers(index: number, digit: number, settings: Settings): number {
    if (!settings.autoRemoveCandidates) return 0;
    const b = bit(digit);
    const targets = this.geometry.peers[index].filter(
      (p) => this.values[p] === 0 && (this.pencils[p] & b) !== 0,
    );
    if (targets.length === 0) return 0;
    this.recordAlso(targets);
    for (const p of targets) this.pencils[p] &= ~b;
    return targets.length;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Every mutation is recorded, so repeated undo winds the grid all the way
   * back to how it started — including past a Restart.
   */
  undo(): boolean {
    const move = this.history.pop();
    if (!move) return false;
    this.future.push(this.apply(move));
    this.completed = false;
    return true;
  }

  redo(): boolean {
    const move = this.future.pop();
    if (!move) return false;
    // Straight onto the history, not through record(), which would discard
    // the rest of the redo stack.
    this.history.push(this.apply(move));
    this.completed = false;
    return true;
  }

  /**
   * A numpad tap. The cell holds a set of digits: one digit shows as an entry,
   * two or more show as candidates — which is why tapping a second digit turns
   * an entry into pencil marks, and tapping a candidate removes it.
   */
  tapDigit(index: number, digit: number, settings: Settings): void {
    if (index < 0 || this.completed || this.isGiven(index)) return;
    this.record([index]);
    const b = bit(digit);

    if (this.values[index] !== 0) {
      if (this.values[index] === digit && !settings.allowSingleCandidates) {
        this.values[index] = 0;
        return;
      }
      // Demote the entry into the candidate set, then toggle the new digit in.
      this.pencils[index] = bit(this.values[index]);
      this.values[index] = 0;
    }

    // Whether this tap took a digit out of the cell rather than putting one in.
    const removing = (this.pencils[index] & b) !== 0;
    this.pencils[index] ^= b;

    // Crossing off candidates until one survives has answered the cell, so it
    // resolves to an entry however the cell was being used. Adding a lone digit
    // is different — that is what "allow single candidates" governs.
    if (popcount(this.pencils[index]) === 1 && (removing || !settings.allowSingleCandidates)) {
      this.values[index] = maskToDigit(this.pencils[index]);
      this.pencils[index] = 0;
      // Deliberately no peer cleanup here: a tap is easy to make by accident,
      // and it should never strip candidates elsewhere in the grid.
    }
  }

  /** Long-click or double-click: this digit is the answer, candidates go away. */
  forceDigit(index: number, digit: number, settings: Settings): number {
    if (index < 0 || this.completed || this.isGiven(index)) return 0;
    this.record([index]);
    this.values[index] = digit;
    this.pencils[index] = 0;
    return this.cleanPeers(index, digit, settings);
  }

  clearCell(index: number): void {
    if (index < 0 || this.completed || this.isGiven(index)) return;
    if (this.values[index] === 0 && this.pencils[index] === 0) return;
    this.record([index]);
    this.values[index] = 0;
    this.pencils[index] = 0;
  }

  /** Flag entries that disagree with the solution. */
  private markWrong(): number {
    this.errors.clear();
    for (let i = 0; i < CELLS; i++) {
      if (this.values[i] !== 0 && this.values[i] !== this.puzzle.solution[i]) this.errors.add(i);
    }
    return this.errors.size;
  }

  /** [Check] — the deliberate version, which is counted against the puzzle. */
  check(): number {
    this.checks++;
    return this.markWrong();
  }

  /**
   * The same flagging, done automatically after each move when the player has
   * asked for it. Not counted: it is a way of playing, not a hint taken.
   */
  flagMistakes(): number {
    return this.markWrong();
  }

  /**
   * Undo back to the last position where nothing on the board was wrong.
   *
   * Check tells you *that* you have gone wrong; from a grid built on a bad
   * digit, undoing by hand means guessing how far back the damage goes. Every
   * move is on the undo stack, so winding back until the board agrees with the
   * solution again finds the exact point. Returns the moves taken back.
   */
  rewindToLastCorrect(): number {
    let steps = 0;
    while (this.wrongCount() > 0 && this.undo()) steps++;
    // Wound back past the mistake, so the flags no longer describe anything.
    if (steps > 0) this.errors.clear();
    return steps;
  }

  /** Entries that disagree with the solution, without flagging them. */
  wrongCount(): number {
    let wrong = 0;
    for (let i = 0; i < CELLS; i++) {
      if (this.values[i] !== 0 && this.values[i] !== this.puzzle.solution[i]) wrong++;
    }
    return wrong;
  }

  /** Every cell filled and correct. */
  isSolved(): boolean {
    for (let i = 0; i < CELLS; i++) if (this.values[i] !== this.puzzle.solution[i]) return false;
    return true;
  }

  restart(): void {
    this.record(Array.from({ length: CELLS }, (_, i) => i));
    this.values = [...this.puzzle.givens];
    this.pencils.fill(0);
    this.errors.clear();
    this.completed = false;
    this.hints = 0;
    this.checks = 0;
  }

  /** Candidate masks from the entries placed, pinned and propagated. */
  private startFromValues(): Uint16Array {
    const start = new Uint16Array(CELLS).fill(0b111111111);
    for (let i = 0; i < CELLS; i++) if (this.values[i] !== 0) start[i] = bit(this.values[i]);
    return start;
  }

  /** Candidates a strong solver can still justify from the answers placed. */
  logicalCandidates(): Uint16Array | null {
    return propagatedCandidates(this.geometry, this.startFromValues());
  }

  /**
   * What a solver would do next from the answers currently on the board, so a
   * hint can explain itself instead of just filling a digit in silently.
   *
   * Worked from the entries alone, deliberately: the player's own pencil marks
   * may be wrong or incomplete, and a hint built on those could mislead.
   */
  nextLogicalStep(): Step | null {
    const start = this.startFromValues();

    /*
     * Run forward until a step actually answers a cell. The early steps are
     * often broad eliminations touching many cells at once, which is true but
     * useless as a hint. What a player wants is a cell they can fill and the
     * reason for it, so an elimination is only offered if nothing answers.
     */
    let fallback: Step | null = null;
    for (let guard = 0; guard < 80; guard++) {
      const step = nextStep(start, this.geometry);
      if (step === null) break;
      if (step.solved) return step;
      fallback ??= step;
    }
    return fallback;
  }

  /**
   * Every technique a solver needs to get from the givens to the answer,
   * counted. This describes the puzzle itself rather than the route the
   * player happened to take — which is what makes it worth showing once the
   * puzzle is done. Ordered hardest first. Empty if the stack cannot finish
   * it unaided.
   */
  solveTrace(): { technique: string; difficulty: number; count: number }[] {
    const candidates = new Uint16Array(CELLS).fill(0b111111111);
    for (let i = 0; i < CELLS; i++) {
      if (this.puzzle.givens[i] !== 0) candidates[i] = bit(this.puzzle.givens[i]);
    }
    const seen = new Map<string, { technique: string; difficulty: number; count: number }>();

    // Generous, but bounded: a hard grid runs to a few hundred steps.
    for (let guard = 0; guard < 2000; guard++) {
      const step = nextStep(candidates, this.geometry);
      if (step === null) break;
      const tally = seen.get(step.technique);
      if (tally) tally.count++;
      else seen.set(step.technique, { technique: step.technique, difficulty: step.difficulty, count: 1 });
    }

    return [...seen.values()].sort((a, b) => b.difficulty - a.difficulty || b.count - a.count);
  }

  /**
   * Pencil in every candidate the solver can still justify, for each empty
   * cell. One move, so a single undo takes the lot back.
   *
   * Returns -1 if the grid contradicts itself — that means an entry is wrong,
   * and filling from an impossible position would write nonsense.
   */
  fillAllCandidates(): number {
    const candidates = this.logicalCandidates();
    if (candidates === null) return -1;

    const targets: number[] = [];
    for (let i = 0; i < CELLS; i++) {
      if (this.values[i] === 0 && this.pencils[i] !== candidates[i]) targets.push(i);
    }
    if (targets.length === 0) return 0;

    this.record(targets);
    for (const i of targets) this.pencils[i] = candidates[i];
    return targets.length;
  }
}
