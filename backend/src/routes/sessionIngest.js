import { parseBody, sendJson, sendError } from '../lib/http.js';
import { validateSessionPayload } from '../validation/sessionPayload.js';
import { upsertSession } from '../db/sessionRepo.js';
import { replaceResults } from '../db/resultRepo.js';

/**
 * POST /api/sessions
 * Receives a session payload from the device, validates, and persists.
 * Idempotent by session_id.
 */
export async function handleSessionIngest(req, res) {
  const body = await parseBody(req);

  const errors = validateSessionPayload(body);
  if (errors.length > 0) {
    sendError(res, 400, 'Validation failed', errors);
    return;
  }

  const { session_id, device_id, start_time, end_time, duration, summary, results } = body;

  // Compute duration_sec if end_time provided but duration is not
  let duration_sec = null;
  if (typeof duration === 'number') {
    duration_sec = duration;
  } else if (end_time) {
    const diff = (new Date(end_time) - new Date(start_time)) / 1000;
    if (Number.isFinite(diff) && diff >= 0) duration_sec = Math.round(diff);
  }

  // Upsert session (idempotent by session_id)
  upsertSession({
    session_id,
    device_id,
    start_time,
    end_time: end_time || null,
    duration_sec,
    summary: summary || null,
  });

  // Replace detection results
  if (Array.isArray(results) && results.length > 0) {
    replaceResults(session_id, results);
  }

  sendJson(res, 201, { status: 'accepted', session_id });
}
