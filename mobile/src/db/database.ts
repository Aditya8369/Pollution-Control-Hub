// mobile/src/db/database.ts
//
// Offline-first SQLite cache for the mobile app (Issue #755).
// Uses expo-sqlite to store API responses locally so field technicians
// can view cached data without an internet connection.

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'pollution_hub_mobile.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);

  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      response_json TEXT NOT NULL,
      cached_at INTEGER NOT NULL,
      ttl_seconds INTEGER NOT NULL DEFAULT 3600
    );
    CREATE INDEX IF NOT EXISTS idx_api_cache_cached_at ON api_cache (cached_at);
  `);

  return dbInstance;
}

export interface CacheEntry {
  cache_key: string;
  response_json: string;
  cached_at: number;
  ttl_seconds: number;
}

export async function getCachedData(key: string): Promise<CacheEntry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<CacheEntry>(
    'SELECT * FROM api_cache WHERE cache_key = ?',
    [key]
  );
  
  if (!row) return null;

  const now = Date.now();
  const ageSeconds = (now - row.cached_at) / 1000;
  
  if (ageSeconds > row.ttl_seconds) {
    // Stale — delete it and return null.
    await db.runAsync('DELETE FROM api_cache WHERE cache_key = ?', [key]);
    return null;
  }

  return row;
}

export async function setCachedData(
  key: string,
  jsonData: string,
  ttlSeconds: number = 3600
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  await db.runAsync(
    `INSERT OR REPLACE INTO api_cache (cache_key, response_json, cached_at, ttl_seconds)
     VALUES (?, ?, ?, ?)`,
    [key, jsonData, now, ttlSeconds]
  );
}

export async function clearExpiredCache(): Promise<number> {
  const db = await getDatabase();
  const now = Date.now();
  
  const result = await db.runAsync(
    'DELETE FROM api_cache WHERE (cached_at + ttl_seconds * 1000) < ?',
    [now]
  );
  
  return result.changes;
}

export async function clearAllCache(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM api_cache');
}
