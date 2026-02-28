import { getConfig } from '../config.js';
import { sendError } from '../lib/http.js';

/**
 * Check the X-Device-Secret header for device ingestion auth.
 * Returns true if authorized, sends 401 and returns false otherwise.
 */
export function requireDeviceAuth(req, res) {
  const secret = req.headers['x-device-secret'];
  const { deviceSecret } = getConfig();

  if (!secret || secret !== deviceSecret) {
    sendError(res, 401, 'Invalid or missing device secret');
    return false;
  }

  return true;
}
