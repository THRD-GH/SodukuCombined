import { generatePuzzle } from '../core/generator.ts';
import type { Puzzle, PuzzleId } from '../core/types.ts';
import { cachePuzzle, cachedPuzzle } from './storage.ts';

/**
 * Generation is milliseconds at the easy levels but can run to many seconds
 * on the heavy variant stacks, so it happens on a worker and the UI shows a
 * spinner. Results are cached, which makes replaying a puzzle number instant.
 */
let worker: Worker | null = null;
let nextToken = 1;
const pending = new Map<number, { resolve: (p: Puzzle) => void; reject: (e: Error) => void }>();

function ensureWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('../worker/generate.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent) => {
      const { token, puzzle, error } = e.data as {
        token: number;
        puzzle?: Puzzle;
        error?: string;
      };
      const entry = pending.get(token);
      if (!entry) return;
      pending.delete(token);
      if (puzzle) entry.resolve(puzzle);
      else entry.reject(new Error(error ?? 'generation failed'));
    };
    worker.onerror = () => {
      // Fall back to the main thread for the rest of the session.
      for (const [, entry] of pending) entry.reject(new Error('worker failed'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

export async function getPuzzle(id: PuzzleId): Promise<Puzzle> {
  const cached = cachedPuzzle(id);
  if (cached) return cached;

  const w = ensureWorker();
  let puzzle: Puzzle;
  if (w) {
    const token = nextToken++;
    puzzle = await new Promise<Puzzle>((resolve, reject) => {
      pending.set(token, { resolve, reject });
      w.postMessage({ token, variants: id.variants, level: id.level, number: id.number });
    }).catch(() => generatePuzzle(id.variants, id.level, id.number));
  } else {
    puzzle = generatePuzzle(id.variants, id.level, id.number);
  }

  cachePuzzle(id, puzzle);
  return puzzle;
}

/** Warm the cache for a puzzle the player is likely to open next. */
export function prefetch(id: PuzzleId): void {
  if (cachedPuzzle(id)) return;
  const w = ensureWorker();
  if (!w) return;
  const token = nextToken++;
  pending.set(token, {
    resolve: (puzzle) => cachePuzzle(id, puzzle),
    reject: () => undefined,
  });
  w.postMessage({ token, variants: id.variants, level: id.level, number: id.number });
}
