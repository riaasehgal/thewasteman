import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { migrate } from './migrate.js';
import { getConfig } from '../config.js';

let _db = null;

/**
 * Get (or create) the singleton SQLite connection.
 * Runs migrations on first call.
 */
export function getDb() {
  if (_db) return _db;

  const { dbPath } = getConfig();

  // Ensure the directory exists
  mkdirSync(dirname(dbPath), { recursive: true });

  _db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // Run migrations
  migrate(_db);

  return _db;
}
