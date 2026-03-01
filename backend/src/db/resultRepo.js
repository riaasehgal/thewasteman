import { getDb } from './sqlite.js';

/**
 * Replace all detection results for a session (delete + reinsert).
 * Called during upsert to keep results in sync with the latest payload.
 */
export function replaceResults(sessionId, results = []) {
  const db = getDb();

  const del = db.prepare('DELETE FROM detection_results WHERE session_id = ?');
  const ins = db.prepare(
    `INSERT INTO detection_results (session_id, category, amount_kg, confidence, extra_json)
     VALUES (?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    del.run(sessionId);
    for (const r of results) {
      const { category, amount_kg, confidence, ...extra } = r;
      const extraJson = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;
      ins.run(sessionId, category, amount_kg ?? null, confidence ?? null, extraJson);
    }
  });

  tx();
}
