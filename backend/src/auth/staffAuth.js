import { getConfig } from '../config.js';
import { sendError } from '../lib/http.js';

/**
 * Middleware-style function: returns true if the request is authenticated
 * as staff (Basic Auth). Sends 401 and returns false otherwise.
 */
export function requireStaffAuth(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="TrashTrack"');
    sendError(res, 401, 'Authentication required');
    return false;
  }

  const { staffUser, staffPass } = getConfig();
  const expected = Buffer.from(`${staffUser}:${staffPass}`).toString('base64');
  const provided = auth.slice(6); // after "Basic "

  if (provided !== expected) {
    sendError(res, 401, 'Invalid credentials');
    return false;
  }

  return true;
}
