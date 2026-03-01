import { createServer } from 'http';
import { getConfig } from './config.js';
import { getDb } from './db/sqlite.js';
import { sendError, sendJson } from './lib/http.js';
import { handleHealth } from './routes/health.js';
import { handleSessionsList } from './routes/sessionsList.js';
import { handleSessionGet } from './routes/sessionGet.js';
import { handleSessionIngest } from './routes/sessionIngest.js';
import { tryServeStatic } from './static.js';

// --------------- helpers ---------------

function parseUrl(raw) {
  const url = new URL(raw, 'http://localhost');
  return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) };
}

function log(req, status) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url} → ${status}`);
}

// ---------- CORS / security headers ----------

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Secret');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

// --------------- router ---------------

async function router(req, res) {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    log(req, 204);
    return;
  }

  const { pathname, query } = parseUrl(req.url);

  try {
    // Health check — no auth
    if (req.method === 'GET' && pathname === '/api/health') {
      handleHealth(req, res);
      log(req, 200);
      return;
    }

    // POST /api/sessions — device ingestion (no auth for prototyping)
    if (req.method === 'POST' && pathname === '/api/sessions') {
      await handleSessionIngest(req, res);
      log(req, res.statusCode);
      return;
    }

    // GET /api/sessions — list
    if (req.method === 'GET' && pathname === '/api/sessions') {
      handleSessionsList(req, res, query);
      log(req, 200);
      return;
    }

    // GET /api/sessions/:session_id — detail
    const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (req.method === 'GET' && sessionMatch) {
      handleSessionGet(req, res, sessionMatch[1]);
      log(req, res.statusCode);
      return;
    }

    // Try serving static frontend files (production mode)
    if (req.method === 'GET' && !pathname.startsWith('/api')) {
      const served = tryServeStatic(req, res, pathname);
      if (served) { log(req, res.statusCode); return; }
    }

    // 404
    sendError(res, 404, 'Not found');
    log(req, 404);
  } catch (err) {
    const status = err.status || 500;
    sendError(res, status, err.message || 'Internal server error');
    log(req, status);
    if (status === 500) console.error(err);
  }
}

// --------------- start ---------------

const config = getConfig();

// Initialize DB on startup
getDb();
console.log(`[TrashTrack] Database ready`);

const server = createServer(router);
server.listen(config.port, () => {
  console.log(`[TrashTrack] Server listening on http://localhost:${config.port}`);
});
