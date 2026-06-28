import * as fs from "node:fs";
import * as path from "node:path";
import type { JournalEntry, JournalReview, WatchlistItem } from "../types/index";

// Node's built-in SQLite module (stable as of Node 22.5+, flagged experimental).
// We require() it lazily with a clear error if the running Node version lacks it,
// rather than pulling in a native-compiled third-party dependency for an MVP.
type DatabaseSyncCtor = new (path: string) => DatabaseSyncInstance;
interface DatabaseSyncInstance {
  exec(sql: string): void;
  prepare(sql: string): {
    run: (...params: unknown[]) => unknown;
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };
  close(): void;
}

function loadDatabaseSync(): DatabaseSyncCtor {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sqliteModule = require("node:sqlite");
    return sqliteModule.DatabaseSync as DatabaseSyncCtor;
  } catch (err) {
    throw new Error(
      "BOUT requires Node.js 22.5+ for the built-in node:sqlite module. " +
        "Please upgrade Node (https://nodejs.org) and try again. " +
        `Original error: ${(err as Error).message}`
    );
  }
}

export class SqliteStore {
  private db: DatabaseSyncInstance;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const DatabaseSync = loadDatabaseSync();
    this.db = new DatabaseSync(dbPath);
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS watchlist (
        symbol TEXT PRIMARY KEY,
        added_at TEXT NOT NULL,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry REAL NOT NULL,
        exit_price REAL NOT NULL,
        stop REAL NOT NULL,
        target REAL NOT NULL,
        setup TEXT,
        emotion TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS journal_reviews (
        entry_id TEXT PRIMARY KEY,
        review_json TEXT NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES journal_entries(id)
      );
    `);
  }

  // -- Watchlist -----------------------------------------------------------

  addWatchlistItem(item: WatchlistItem): void {
    this.db
      .prepare(
        `INSERT INTO watchlist (symbol, added_at, notes)
         VALUES (?, ?, ?)
         ON CONFLICT(symbol) DO UPDATE SET added_at = excluded.added_at, notes = excluded.notes`
      )
      .run(item.symbol.toUpperCase(), item.addedAt, item.notes ?? null);
  }

  listWatchlist(): WatchlistItem[] {
    const rows = this.db
      .prepare(`SELECT symbol, added_at as addedAt, notes FROM watchlist ORDER BY added_at ASC`)
      .all() as WatchlistItem[];
    return rows;
  }

  removeWatchlistItem(symbol: string): void {
    this.db.prepare(`DELETE FROM watchlist WHERE symbol = ?`).run(symbol.toUpperCase());
  }

  // -- Journal ---------------------------------------------------------------

  addJournalEntry(entry: JournalEntry): void {
    this.db
      .prepare(
        `INSERT INTO journal_entries
          (id, symbol, direction, entry, exit_price, stop, target, setup, emotion, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        entry.symbol.toUpperCase(),
        entry.direction,
        entry.entry,
        entry.exit,
        entry.stop,
        entry.target,
        entry.setup,
        entry.emotion,
        entry.notes,
        entry.createdAt
      );
  }

  listJournalEntries(): JournalEntry[] {
    const rows = this.db
      .prepare(
        `SELECT id, symbol, direction, entry, exit_price as exit, stop, target, setup, emotion, notes, created_at as createdAt
         FROM journal_entries ORDER BY created_at DESC`
      )
      .all() as JournalEntry[];
    return rows;
  }

  getJournalEntry(id: string): JournalEntry | null {
    const row = this.db
      .prepare(
        `SELECT id, symbol, direction, entry, exit_price as exit, stop, target, setup, emotion, notes, created_at as createdAt
         FROM journal_entries WHERE id = ?`
      )
      .get(id) as JournalEntry | undefined;
    return row ?? null;
  }

  saveJournalReview(review: JournalReview): void {
    this.db
      .prepare(
        `INSERT INTO journal_reviews (entry_id, review_json)
         VALUES (?, ?)
         ON CONFLICT(entry_id) DO UPDATE SET review_json = excluded.review_json`
      )
      .run(review.entryId, JSON.stringify(review));
  }

  getJournalReview(entryId: string): JournalReview | null {
    const row = this.db.prepare(`SELECT review_json FROM journal_reviews WHERE entry_id = ?`).get(entryId) as
      | { review_json: string }
      | undefined;
    if (!row) return null;
    return JSON.parse(row.review_json) as JournalReview;
  }

  close(): void {
    this.db.close();
  }
}
