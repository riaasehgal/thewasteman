const BASE = '/api';

export async function fetchSessions({ limit = 50, offset = 0 } = {}) {
  const res = await fetch(`${BASE}/sessions?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
  return res.json(); // { sessions, total, limit, offset }
}

export async function fetchSession(sessionId) {
  const res = await fetch(`${BASE}/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`Failed to fetch session: ${res.status}`);
  return res.json(); // { session_id, device_id, start_time, ..., results[] }
}
