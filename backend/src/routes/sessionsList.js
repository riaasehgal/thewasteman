import { listSessions } from '../db/sessionRepo.js';
import { sendJson } from '../lib/http.js';

/**
 * GET /api/sessions?limit=20&offset=0
 * Returns paginated sessions ordered by most recent first.
 * Enforces limit <= 50 per FR-013.
 */
export function handleSessionsList(_req, res, query) {
  let limit = parseInt(query.limit, 10) || 20;
  const offset = Math.max(0, parseInt(query.offset, 10) || 0);

  // FR-013 / T026: enforce max 50
  if (limit < 1) limit = 1;
  if (limit > 50) limit = 50;

  const data = listSessions({ limit, offset });
  sendJson(res, 200, data);
}
