import { getDb } from './sqlite.js';

/* ------------------------------------------------------------------ */
/*  List sessions (paginated, most-recent first)                      */
/* ------------------------------------------------------------------ */
export function listSessions({ limit = 20, offset = 0 } = {}) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT session_id, device_id, start_time, end_time, duration_sec, summary_json, created_at
       FROM sessions
       ORDER BY start_time DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  const countRow = db.prepare('SELECT COUNT(*) AS total FROM sessions').get();

  // Attach per-category breakdown to each session
  const catStmt = db.prepare(
    `SELECT category, SUM(amount_kg) AS total_kg, COUNT(*) AS count
     FROM detection_results WHERE session_id = ?
     GROUP BY category ORDER BY total_kg DESC`
  );

  const sessions = rows.map((row) => {
    const categories = catStmt.all(row.session_id).map((c) => ({
      category: c.category,
      total_kg: c.total_kg,
      count: c.count,
    }));
    return { ...formatSession(row), categories };
  });

  return {
    sessions,
    total: countRow.total,
    limit,
    offset,
  };
}

/* ------------------------------------------------------------------ */
/*  Get a single session by session_id (with detection results)       */
/* ------------------------------------------------------------------ */
export function getSession(sessionId) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT session_id, device_id, start_time, end_time, duration_sec, summary_json, created_at
       FROM sessions WHERE session_id = ?`
    )
    .get(sessionId);

  if (!row) return null;

  const results = db
    .prepare(
      `SELECT category, amount_kg, confidence, extra_json
       FROM detection_results WHERE session_id = ?`
    )
    .all(sessionId);

  return {
    ...formatSession(row),
    results: results.map((r) => ({
      category: r.category,
      amount_kg: r.amount_kg,
      confidence: r.confidence,
      ...(r.extra_json ? JSON.parse(r.extra_json) : {}),
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Upsert a session (idempotent by session_id)                       */
/* ------------------------------------------------------------------ */
export function upsertSession({ session_id, device_id, start_time, end_time, duration_sec, summary }) {
  const db = getDb();
  const summaryJson = summary ? JSON.stringify(summary) : null;

  db.prepare(
    `INSERT INTO sessions (session_id, device_id, start_time, end_time, duration_sec, summary_json)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       device_id    = excluded.device_id,
       start_time   = excluded.start_time,
       end_time     = excluded.end_time,
       duration_sec = excluded.duration_sec,
       summary_json = excluded.summary_json,
       updated_at   = datetime('now')`
  ).run(session_id, device_id, start_time, end_time ?? null, duration_sec ?? null, summaryJson);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function formatSession(row) {
  return {
    session_id: row.session_id,
    device_id: row.device_id,
    start_time: row.start_time,
    end_time: row.end_time,
    duration_sec: row.duration_sec,
    summary: row.summary_json ? JSON.parse(row.summary_json) : null,
    created_at: row.created_at,
  };
}
