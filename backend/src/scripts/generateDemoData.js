/**
 * Generate larger demo data for performance validation.
 * Creates 100 sessions with up to 1,000 detection results each.
 * Usage: cd backend && npm run generate-demo
 */
import { getDb } from '../db/sqlite.js';
import { upsertSession } from '../db/sessionRepo.js';
import { replaceResults } from '../db/resultRepo.js';

const db = getDb();

const CATEGORIES = [
  'bread', 'fruit', 'vegetables', 'dairy', 'meat', 'rice', 'pasta',
  'salad', 'soup', 'dessert', 'cereal', 'beans', 'eggs', 'fish',
  'potatoes', 'noodles', 'pizza', 'sandwich', 'juice', 'coffee_grounds',
];

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

const SESSION_COUNT = 100;
const MAX_RESULTS = 1000;

console.log(`Generating ${SESSION_COUNT} sessions (up to ${MAX_RESULTS} results each)...`);
const t0 = Date.now();

for (let i = 1; i <= SESSION_COUNT; i++) {
  const now = new Date();
  const start = new Date(now.getTime() - i * 1800_000);
  const end = new Date(start.getTime() + 3600_000);

  const session_id = `perf-sess-${String(i).padStart(4, '0')}`;
  const numResults = i === 1 ? MAX_RESULTS : Math.floor(Math.random() * 50) + 5;

  const results = [];
  for (let j = 0; j < numResults; j++) {
    results.push({
      category: CATEGORIES[j % CATEGORIES.length],
      amount_kg: randomBetween(0.01, 10.0),
      confidence: randomBetween(0.5, 1.0),
    });
  }

  const total_waste_kg = results.reduce((s, r) => s + r.amount_kg, 0);

  const duration_sec = Math.round((end - start) / 1000);

  upsertSession({
    session_id,
    device_id: 'pi-perf',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration_sec,
    summary: {
      total_waste_kg: Math.round(total_waste_kg * 100) / 100,
      total_detections: results.length,
    },
  });
  replaceResults(session_id, results);

  if (i % 20 === 0) console.log(`  ${i}/${SESSION_COUNT} sessions...`);
}

console.log(`Done in ${Date.now() - t0}ms.`);
