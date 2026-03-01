/**
 * Seed the database with sample sessions + detection results for demos.
 * Usage: cd backend && npm run seed
 */
import { getDb } from '../db/sqlite.js';
import { upsertSession } from '../db/sessionRepo.js';
import { replaceResults } from '../db/resultRepo.js';

const db = getDb();

const CATEGORIES = ['bread', 'fruit', 'vegetables', 'dairy', 'meat', 'rice', 'pasta', 'salad', 'soup', 'dessert'];

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateSession(index) {
  const now = new Date();
  const start = new Date(now.getTime() - index * 3600_000 * 3); // 3h apart
  const end = new Date(start.getTime() + 3600_000); // 1h duration

  const session_id = `seed-sess-${String(index).padStart(3, '0')}`;
  const numResults = Math.floor(Math.random() * 8) + 2;

  const results = [];
  const usedCategories = new Set();
  for (let i = 0; i < numResults; i++) {
    let cat;
    do {
      cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    } while (usedCategories.has(cat) && usedCategories.size < CATEGORIES.length);
    usedCategories.add(cat);

    results.push({
      category: cat,
      amount_kg: randomBetween(0.1, 5.0),
      confidence: randomBetween(0.7, 1.0),
    });
  }

  const total_waste_kg = results.reduce((sum, r) => sum + r.amount_kg, 0);

  const duration_sec = Math.round((end - start) / 1000);

  return {
    session_id,
    device_id: 'pi-01',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration_sec,
    summary: {
      total_waste_kg: Math.round(total_waste_kg * 100) / 100,
      total_detections: results.length,
    },
    results,
  };
}

// Generate 10 sample sessions
const count = 10;
console.log(`Seeding ${count} sessions...`);

for (let i = 1; i <= count; i++) {
  const session = generateSession(i);
  upsertSession(session);
  replaceResults(session.session_id, session.results);
  console.log(`  ✓ ${session.session_id} (${session.results.length} results)`);
}

console.log('Done! Seed data inserted.');
