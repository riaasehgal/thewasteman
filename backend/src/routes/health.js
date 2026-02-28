import { sendJson } from '../lib/http.js';

export function handleHealth(_req, res) {
  sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
}
