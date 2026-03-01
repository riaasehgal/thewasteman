import { sendJson } from '../lib/http.js';
import { getDb } from '../db/sqlite.js';

/**
 * GET /api/sessions/active
 * Returns the currently active session (end_time IS NULL), or null if none.
 * The RPi polls this endpoint to know when to start/stop capturing.
 */
export function handleSessionActive(req, res) {
  const db = getDb();

  const row = db.prepare(
    `SELECT session_id, device_id, start_time, end_time, duration_sec, summary_json, created_at
     FROM sessions
     WHERE end_time IS NULL
     ORDER BY created_at DESC
     LIMIT 1`
  ).get();

  if (!row) {
    sendJson(res, 200, { active: false, session: null });
    return;
  }

  sendJson(res, 200, {
    active: true,
    session: {
      session_id: row.session_id,
      device_id: row.device_id,
      start_time: row.start_time,
      summary: row.summary_json ? JSON.parse(row.summary_json) : null,
      created_at: row.created_at,
    },
  });
}
