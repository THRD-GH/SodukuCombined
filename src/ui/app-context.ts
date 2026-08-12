import type { Level, PuzzleId, Variants } from '../core/types.ts';
import type { History, Settings } from '../game/storage.ts';

/** What the screens are allowed to ask of the app shell. */
export interface AppContext {
  settings: Settings;
  history: History;
  /** Puzzles per pool the pickers offer. Generation itself is unlimited. */
  poolSize: number;
  applyTheme(): void;
  /** Re-apply the side the keypad sits on. */
  applyKeypadSide(): void;
  /** Take or drop the screen wake lock, after the setting changes. */
  applyWakeLock(): void;
  /** Re-read storage and return to the menu, after an import replaces it. */
  reload(): void;
  /** Repaint the board in place, e.g. after a highlighting setting changes. */
  refreshBoard(): void;
  goMenu(): void;
  goStats(level: Level): void;
  openHelp(): void;
  openSettings(): void;
  playPuzzle(id: PuzzleId): void;
  playRandom(variants: Variants, level: Level): void;
}
