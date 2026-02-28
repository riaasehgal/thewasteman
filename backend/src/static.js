import { existsSync, readFileSync } from 'fs';
import { resolve, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = resolve(__dirname, '..', '..', 'frontend', 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

/**
 * Try to serve a file from the frontend/dist directory.
 * Falls back to index.html for SPA routing.
 * Returns true if a response was sent, false if not (no dist folder).
 */
export function tryServeStatic(_req, res, pathname) {
  if (!existsSync(STATIC_DIR)) return false;

  let filePath = join(STATIC_DIR, pathname);

  // If it's a directory or doesn't exist, try index.html (SPA fallback)
  if (!existsSync(filePath) || !filePath.includes('.')) {
    filePath = join(STATIC_DIR, 'index.html');
  }

  if (!existsSync(filePath)) return false;

  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const content = readFileSync(filePath);

  res.writeHead(200, { 'Content-Type': mime, 'Content-Length': content.length });
  res.end(content);
  return true;
}
