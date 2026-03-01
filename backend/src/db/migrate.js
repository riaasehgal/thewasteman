import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Run the schema.sql migration against the provided db instance.
 * Safe to call on every startup — uses CREATE IF NOT EXISTS.
 */
export function migrate(db) {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(sql);

  // Add columns that may not exist in older databases
  const addCol = (table, col, type) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch (_) { /* already exists */ }
  };
  addCol('sessions', 'name', 'TEXT');
  addCol('sessions', 'meal_type', 'TEXT');
}
