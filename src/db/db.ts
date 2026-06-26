import * as SQLite from 'expo-sqlite';

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = SQLite.openDatabaseAsync('twinkle.db').then(async (db) => {
      await initSchema(db);
      return db;
    });
  }
  return _dbPromise;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stops (
      id              TEXT PRIMARY KEY NOT NULL,
      slot            TEXT NOT NULL,
      customer        TEXT NOT NULL,
      area            TEXT NOT NULL,
      address         TEXT NOT NULL,
      lat             REAL NOT NULL,
      lng             REAL NOT NULL,
      items_json      TEXT NOT NULL,
      must_finish_by  TEXT NOT NULL,
      status          TEXT NOT NULL,
      notes           TEXT,
      proof_photo_uri TEXT,
      failed_reason   TEXT,
      fetched_at      INTEGER NOT NULL
    );
  `);
  // Migration: add failed_reason to existing databases that predate this column
  try {
    await db.execAsync('ALTER TABLE stops ADD COLUMN failed_reason TEXT');
  } catch {
    // column already exists — safe to ignore
  }
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS outbox (
      id           TEXT PRIMARY KEY NOT NULL,
      stop_id      TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'status_change',
      payload_json TEXT NOT NULL,
      sync_state   TEXT NOT NULL DEFAULT 'pending',
      retry_count  INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL
    );
  `);
}
