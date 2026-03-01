import { parseBody, sendJson, sendError } from '../lib/http.js';
import { getDb } from '../db/sqlite.js';

/**
 * POST /api/sessions/:session_id/detections
 * Adds detection results to an active session (appends, does not replace).
 * Also updates the session summary_json with cumulative counts.
 *
 * Expected body: { results: [{ category, confidence, amount_kg?, ... }] }
 */
export async function handleAddDetections(req, res, sessionId) {
  const body = await parseBody(req);

  if (!body.results || !Array.isArray(body.results) || body.results.length === 0) {
    sendError(res, 400, 'results array is required and must not be empty');
    return;
  }

  const db = getDb();

  // Verify session exists and is active
  const session = db.prepare('SELECT session_id, end_time, summary_json FROM sessions WHERE session_id = ?').get(sessionId);
  if (!session) {
    sendError(res, 404, 'Session not found');
    return;
  }
  if (session.end_time) {
    sendError(res, 400, 'Session is already stopped');
    return;
  }

  // Insert new detection results
  const ins = db.prepare(
    `INSERT INTO detection_results (session_id, category, amount_kg, confidence, extra_json)
     VALUES (?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    for (const r of body.results) {
      if (!r.category) continue;
      const { category, amount_kg, confidence, ...extra } = r;
      const extraJson = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;
      ins.run(sessionId, category, amount_kg ?? null, confidence ?? null, extraJson);
    }
  });
  tx();

  // Recompute summary from all detection_results for this session
  const allResults = db.prepare(
    `SELECT category, COUNT(*) AS cnt, AVG(confidence) AS avg_conf
     FROM detection_results WHERE session_id = ?
     GROUP BY category`
  ).all(sessionId);

  const totalItems = allResults.reduce((s, r) => s + r.cnt, 0);
  const categoryBreakdown = {};
  for (const r of allResults) {
    categoryBreakdown[r.category] = r.cnt;
  }

  const summary = {
    total_items: totalItems,
    categories_detected: allResults.length,
    category_breakdown: categoryBreakdown,
  };

  db.prepare(
    `UPDATE sessions SET summary_json = ?, updated_at = datetime('now') WHERE session_id = ?`
  ).run(JSON.stringify(summary), sessionId);

  sendJson(res, 201, {
    status: 'accepted',
    session_id: sessionId,
    new_detections: body.results.length,
    total_detections: totalItems,
  });
}
