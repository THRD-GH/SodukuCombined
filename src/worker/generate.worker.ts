import { generatePuzzle } from '../core/generator.ts';
import type { Level, Variants } from '../core/types.ts';

interface Request {
  token: number;
  variants: Variants;
  level: Level;
  number: number;
}

// Typed by hand rather than pulling the WebWorker lib in alongside DOM.
const ctx = self as unknown as {
  postMessage(message: unknown): void;
  onmessage: ((e: MessageEvent) => void) | null;
};

ctx.onmessage = (e: MessageEvent) => {
  const { token, variants, level, number } = e.data as Request;
  try {
    ctx.postMessage({ token, puzzle: generatePuzzle(variants, level, number) });
  } catch (err) {
    ctx.postMessage({ token, error: err instanceof Error ? err.message : String(err) });
  }
};
