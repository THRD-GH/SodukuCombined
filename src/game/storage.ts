import type { Level, Puzzle, PuzzleId, Variants } from '../core/types.ts';
import { NO_VARIANTS, formatPuzzleId, parsePuzzleId } from '../core/types.ts';

export { parsePuzzleId };

const KEY = {
  settings: 'sv:v1:settings',
  history: 'sv:v1:history',
  cache: 'sv:v1:cache',
} as const;

/** How many puzzles each variant/level pool offers. Generation is unlimited;
 *  this just bounds the picker list so "unplayed puzzles" stays meaningful. */
export const POOL_SIZE = 500;

export type Theme = 'night' | 'day' | 'contrast';

/** Which side of the controls the number keys sit on. */
export type KeypadSide = 'left' | 'right';

/**
 * How the keypad writes into a cell. 'gesture' is the original scheme: a tap
 * toggles candidates and the deliberate gestures write the answer. 'classic'
 * is the style most sudoku apps use: a NOTES switch chooses what a tap means.
 */
export type InputStyle = 'gesture' | 'classic';

export interface Settings {
  /** When on, a tapped digit is always a candidate — entries need a long-click. */
  allowSingleCandidates: boolean;
  /** Which of the two keypad schemes is in force. */
  inputStyle: InputStyle;
  /** Which palette to draw. 'contrast' is the accessible high-contrast one. */
  theme: Theme;
  /**
   * True once the theme was picked by hand in Settings. Without it a stored
   * theme is just whatever the default happened to be when settings were
   * first saved, and does not outrank a changed default.
   */
  themeChosen: boolean;
  /** Which side the keypad sits on, with the other buttons across from it. */
  keypadSide: KeypadSide;
  /** Tint every cell that shares a unit with the selected one. */
  highlightPeers: boolean;
  /** Tint other cells holding the same digit as the selected one. */
  highlightSameDigit: boolean;
  /** Forcing an answer strikes that digit from the candidates of its peers. */
  autoRemoveCandidates: boolean;
  /** Flag a wrong entry the moment it is made, without waiting for Check. */
  instantCheck: boolean;
  /** Hold a wake lock while a puzzle is open, so the screen stops dimming. */
  keepAwake: boolean;
  hintNeedsLongClick: boolean;
  undoNeedsLongClick: boolean;
  clearNeedsLongClick: boolean;
  showTimer: boolean;
  /** The variant toggles as last left on the menu. */
  variants: Variants;
  /** The difficulty dial as last left on the menu. */
  level: Level;
}

export const DEFAULT_SETTINGS: Settings = {
  allowSingleCandidates: false,
  inputStyle: 'gesture',
  theme: 'day',
  themeChosen: false,
  keypadSide: 'left',
  highlightPeers: true,
  highlightSameDigit: true,
  autoRemoveCandidates: true,
  instantCheck: false,
  keepAwake: true,
  hintNeedsLongClick: false,
  undoNeedsLongClick: false,
  clearNeedsLongClick: true,
  showTimer: true,
  variants: { ...NO_VARIANTS },
  level: 1,
};

export interface PuzzleRecord {
  finished: boolean;
  /** Playable again even though it has been started. */
  released: boolean;
  /** When it was first opened, so unfinished games can be listed newest first. */
  startedAt?: number;
  bestMs?: number;
  bestAt?: number;
  hints?: number;
  checks?: number;
}

export type History = Record<string, PuzzleRecord>;

export interface SavedGame {
  id: PuzzleId;
  puzzle: Puzzle;
  values: number[];
  pencils: number[];
  elapsedMs: number;
  hints: number;
  checks: number;
  /** Undo and redo stacks, so they survive putting the puzzle down. */
  past?: number[][];
  future?: number[][];
  /** When it was last written, so the newest can be resumed and the oldest dropped. */
  savedAt?: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota — the game still plays, it just forgets.
  }
}

export const loadSettings = (): Settings => {
  const stored = read<Partial<Settings>>(KEY.settings, {});
  const level: Level =
    typeof stored.level === 'number' && stored.level >= 1 && stored.level <= 6
      ? (Math.round(stored.level) as Level)
      : DEFAULT_SETTINGS.level;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    variants: { ...NO_VARIANTS, ...(stored.variants ?? {}) },
    level,
    inputStyle: stored.inputStyle === 'classic' ? 'classic' : 'gesture',
    // A theme nobody picked is not a preference — early storage carries the
    // old night default baked in, and the default is day now.
    theme: stored.themeChosen ? (stored.theme ?? DEFAULT_SETTINGS.theme) : DEFAULT_SETTINGS.theme,
  };
};
export const saveSettings = (s: Settings): void => write(KEY.settings, s);

export const loadHistory = (): History => read<History>(KEY.history, {});
export const saveHistory = (h: History): void => write(KEY.history, h);

/**
 * Games are saved one key per puzzle, so every unfinished game keeps its own
 * grid and undo history.
 */
const savePrefix = 'sv:v1:save:';
const saveKeyFor = (id: PuzzleId): string => savePrefix + formatPuzzleId(id);

/** Parked games kept before the oldest is dropped. A few kB each. */
const MAX_SAVES = 30;

function saveKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== null && key.startsWith(savePrefix)) keys.push(key);
  }
  return keys;
}

export function loadSaveFor(id: PuzzleId): SavedGame | null {
  return read<SavedGame | null>(saveKeyFor(id), null);
}

/** The most recently played game, for the menu's Resume button. */
export function latestSave(): SavedGame | null {
  let best: SavedGame | null = null;
  for (const key of saveKeys()) {
    const saved = read<SavedGame | null>(key, null);
    if (saved === null) continue;
    if (best === null || (saved.savedAt ?? 0) > (best.savedAt ?? 0)) best = saved;
  }
  return best;
}

export function saveGame(game: SavedGame): void {
  write(saveKeyFor(game.id), { ...game, savedAt: Date.now() });

  // Drop the oldest once there are more parked games than we keep.
  const keys = saveKeys();
  if (keys.length <= MAX_SAVES) return;
  const byAge = keys
    .map((key) => ({ key, at: read<SavedGame | null>(key, null)?.savedAt ?? 0 }))
    .sort((a, b) => a.at - b.at);
  for (const stale of byAge.slice(0, keys.length - MAX_SAVES)) localStorage.removeItem(stale.key);
}

export const clearSaveFor = (id: PuzzleId): void => localStorage.removeItem(saveKeyFor(id));

/** Every parked game, newest first — used by Resume and the export. */
export function allSaves(): SavedGame[] {
  return saveKeys()
    .map((key) => read<SavedGame | null>(key, null))
    .filter((g): g is SavedGame => g !== null)
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

/** True if the puzzle has been started and not released for replay. */
export function isLocked(history: History, id: PuzzleId): boolean {
  const rec = history[formatPuzzleId(id)];
  return rec !== undefined && !rec.released;
}

export function unplayedNumbers(
  history: History,
  variants: Variants,
  level: Level,
  poolSize: number,
): number[] {
  const out: number[] = [];
  for (let n = 1; n <= poolSize; n++) {
    if (!isLocked(history, { variants, level, number: n })) out.push(n);
  }
  return out;
}

export interface LevelStats {
  played: number;
  finished: number;
  averageMs: number | null;
}

export function levelStats(
  history: History,
  variants: Variants,
  level: Level,
  poolSize: number,
): LevelStats {
  let played = 0;
  let finished = 0;
  let total = 0;
  for (let n = 1; n <= poolSize; n++) {
    const rec = history[formatPuzzleId({ variants, level, number: n })];
    if (!rec) continue;
    played++;
    if (rec.finished && rec.bestMs !== undefined) {
      finished++;
      total += rec.bestMs;
    }
  }
  return { played, finished, averageMs: finished > 0 ? Math.round(total / finished) : null };
}

export interface TotalStats {
  played: number;
  finished: number;
  averageMs: number | null;
  best: { id: string; ms: number } | null;
  hints: number;
  checks: number;
  /** Days in a row, up to today, with at least one puzzle finished. */
  streak: number;
  /** Puzzles finished per level, indexed 1-6, across every variant pool. */
  byLevel: number[];
}

/** The day a timestamp falls on, in the reader's own time zone. */
const dayNumber = (ms: number): number => {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
};

/**
 * Everything played, across every level and variant pool. The per-pool
 * figures are already on the screen; this answers "how am I doing overall".
 */
export function totalStats(history: History, now = Date.now()): TotalStats {
  const out: TotalStats = {
    played: 0,
    finished: 0,
    averageMs: null,
    best: null,
    hints: 0,
    checks: 0,
    streak: 0,
    byLevel: new Array<number>(7).fill(0),
  };

  let total = 0;
  const days = new Set<number>();

  for (const [key, rec] of Object.entries(history)) {
    out.played++;
    out.hints += rec.hints ?? 0;
    out.checks += rec.checks ?? 0;
    if (!rec.finished || rec.bestMs === undefined) continue;
    out.finished++;
    total += rec.bestMs;
    const level = parsePuzzleId(key)?.level;
    if (level !== undefined) out.byLevel[level]++;
    if (out.best === null || rec.bestMs < out.best.ms) out.best = { id: key, ms: rec.bestMs };
    if (rec.bestAt !== undefined) days.add(dayNumber(rec.bestAt));
  }

  out.averageMs = out.finished > 0 ? Math.round(total / out.finished) : null;

  // Counted back from today, or from yesterday when today has not been played
  // yet — an evening habit should not read as broken all morning.
  const today = dayNumber(now);
  let day = days.has(today) ? today : today - 1;
  while (days.has(day)) {
    out.streak++;
    day--;
  }
  return out;
}

/** Mark a puzzle as started, so it drops out of the unplayed list. */
export function markStarted(history: History, id: PuzzleId, now = Date.now()): History {
  const key = formatPuzzleId(id);
  if (!history[key]) history[key] = { finished: false, released: false, startedAt: now };
  else history[key] = { ...history[key], released: false, startedAt: history[key].startedAt ?? now };
  return history;
}

export interface Backup {
  app: 'sudoku-variants';
  version: 1;
  exportedAt: string;
  settings: Settings;
  history: History;
  saves: SavedGame[];
}

/** Everything worth keeping, in one object. */
export function exportBackup(): Backup {
  return {
    app: 'sudoku-variants',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    history: loadHistory(),
    saves: allSaves(),
  };
}

/**
 * Restore a backup, replacing what is here. Validated before anything is
 * written, so a wrong file cannot leave storage half-overwritten.
 */
export function importBackup(raw: unknown): { history: number; saves: number } {
  const data = raw as Partial<Backup> | null;
  if (!data || data.app !== 'sudoku-variants' || typeof data.history !== 'object') {
    throw new Error('That is not a backup from this game');
  }
  const saves = Array.isArray(data.saves) ? data.saves : [];
  for (const game of saves) {
    if (!game?.id || !Array.isArray(game.values) || game.values.length !== 81) {
      throw new Error('That backup is damaged');
    }
  }

  for (const key of saveKeys()) localStorage.removeItem(key);
  write(KEY.history, data.history);
  if (data.settings) write(KEY.settings, { ...DEFAULT_SETTINGS, ...data.settings });
  for (const game of saves) write(saveKeyFor(game.id), game);

  return { history: Object.keys(data.history as History).length, saves: saves.length };
}

/**
 * A link to one puzzle. Puzzles are fully determined by their id, so the id
 * is the whole payload — no grid needs encoding.
 */
export function puzzleLink(id: PuzzleId): string {
  const url = new URL(window.location.href);
  url.search = `?p=${formatPuzzleId(id)}`;
  url.hash = '';
  return url.toString();
}

/** The puzzle named in ?p=, if the address bar carries one. */
export function linkedPuzzle(): PuzzleId | null {
  const asked = new URLSearchParams(window.location.search).get('p');
  return asked === null ? null : parsePuzzleId(asked.trim().toUpperCase());
}

/** Drop ?p= once it has been acted on, so a refresh does not reopen it. */
export function clearPuzzleLink(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('p')) return;
  url.search = '';
  window.history.replaceState(null, '', url.toString());
}

export interface UnfinishedGame {
  id: PuzzleId;
  record: PuzzleRecord;
}

/**
 * Every puzzle opened but never solved, across all pools, newest first.
 */
export function unfinishedGames(history: History): UnfinishedGame[] {
  const out: UnfinishedGame[] = [];
  for (const [key, record] of Object.entries(history)) {
    if (record.finished) continue;
    const id = parsePuzzleId(key);
    if (id) out.push({ id, record });
  }
  return out.sort((a, b) => (b.record.startedAt ?? 0) - (a.record.startedAt ?? 0));
}

/** Record a finish, keeping the best time and the stats that went with it. */
export function markFinished(
  history: History,
  id: PuzzleId,
  ms: number,
  hints: number,
  checks: number,
  now: number,
): History {
  const key = formatPuzzleId(id);
  const rec = history[key] ?? { finished: false, released: false };
  if (rec.bestMs === undefined || ms < rec.bestMs) {
    history[key] = { ...rec, finished: true, released: false, bestMs: ms, bestAt: now, hints, checks };
  } else {
    history[key] = { ...rec, finished: true, released: false };
  }
  return history;
}

/**
 * Forget a puzzle entirely: it leaves the history and goes back to being
 * unplayed, so it can turn up again in its pool.
 */
export function forgetPuzzle(history: History, id: PuzzleId): History {
  delete history[formatPuzzleId(id)];
  return history;
}

export function releasePuzzle(history: History, id: PuzzleId): History {
  const key = formatPuzzleId(id);
  if (history[key]) history[key] = { ...history[key], released: true };
  return history;
}

export function resetPool(
  history: History,
  variants: Variants,
  level: Level,
  poolSize: number,
): History {
  for (let n = 1; n <= poolSize; n++) {
    delete history[formatPuzzleId({ variants, level, number: n })];
  }
  return history;
}

/** Generated puzzles are deterministic but slow to rebuild, so keep recent ones. */
const CACHE_LIMIT = 40;
type Cache = Record<string, Puzzle>;

export function cachedPuzzle(id: PuzzleId): Puzzle | null {
  return read<Cache>(KEY.cache, {})[formatPuzzleId(id)] ?? null;
}

export function cachePuzzle(id: PuzzleId, puzzle: Puzzle): void {
  const cache = read<Cache>(KEY.cache, {});
  const keys = Object.keys(cache);
  if (keys.length >= CACHE_LIMIT) delete cache[keys[0]];
  cache[formatPuzzleId(id)] = puzzle;
  write(KEY.cache, cache);
}
