import { sendJson, sendError } from '../lib/http.js';
import { getDb } from '../db/sqlite.js';

/**
 * POST /api/sessions/:session_id/stop
 * Marks the session as ended by setting end_time and duration_sec.
 */
export function handleSessionStop(req, res, sessionId) {
  const db = getDb();

  const row = db.prepare('SELECT start_time, end_time FROM sessions WHERE session_id = ?').get(sessionId);
  if (!row) {
    sendError(res, 404, 'Session not found');
    return;
  }
  if (row.end_time) {
    sendError(res, 400, 'Session already stopped');
    return;
  }

  const now = new Date().toISOString();
  const durationSec = Math.round((new Date(now) - new Date(row.start_time)) / 1000);

  db.prepare(
    `UPDATE sessions SET end_time = ?, duration_sec = ?, updated_at = datetime('now') WHERE session_id = ?`
  ).run(now, durationSec, sessionId);

  sendJson(res, 200, { status: 'stopped', session_id: sessionId, end_time: now, duration_sec: durationSec });
}
