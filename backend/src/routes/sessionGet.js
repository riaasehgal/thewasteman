import { getSession } from '../db/sessionRepo.js';
import { sendJson, sendError } from '../lib/http.js';

/**
 * GET /api/sessions/:session_id
 * Returns session metadata + detection results.
 */
export function handleSessionGet(_req, res, sessionId) {
  const session = getSession(sessionId);

  if (!session) {
    sendError(res, 404, 'Session not found');
    return;
  }

  sendJson(res, 200, session);
}
