import { randomUUID } from 'crypto';
import { parseBody, sendJson } from '../lib/http.js';
import { upsertSession } from '../db/sessionRepo.js';

/**
 * POST /api/sessions/start
 * Creates a new active session (no end_time) and returns the session_id.
 * Body (optional): { name?: string, meal_type?: "Breakfast"|"Lunch"|"Dinner" }
 */
export async function handleSessionStart(req, res) {
  const body = await parseBody(req);
  const session_id = randomUUID();
  const now = new Date().toISOString();

  const name = body.name || null;
  const meal_type = body.meal_type || null;

  upsertSession({
    session_id,
    device_id: 'rpi5-001',
    name,
    meal_type,
    start_time: now,
    end_time: null,
    duration_sec: null,
    summary: { total_items: 0, categories_detected: 0, category_breakdown: {} },
  });

  sendJson(res, 201, { status: 'started', session_id, start_time: now, name, meal_type });
}
