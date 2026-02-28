// ── API Service ───────────────────────────────────────────────────────────────
// All backend calls live here. Pages NEVER call fetch() directly.
//
// .env setup:
//   VITE_API_URL=http://raspberrypi.local:8000   <- Pi's FastAPI backend
//   VITE_USE_MOCK=true                           <- use mock data, no Pi needed
//
// Flip VITE_USE_MOCK to false (or remove it) when the backend is ready.

import * as mock from "../data/mockDb.js";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const BASE     = import.meta.env.VITE_API_URL  ?? "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ── Sessions ──────────────────────────────────────────────────────────────────

// GET /api/sessions
// Returns: Array<{ id, name, type, date, items, waste }>
export const getSessions = () => {
  if (USE_MOCK) return Promise.resolve(mock.SESSIONS);
  return request("/api/sessions");
};

// GET /api/sessions/:id/stats
// Returns: { totalItems, avgWaste, mostWasted, chartData[], feed[] }
export const getSessionStats = (id) => {
  if (USE_MOCK) return Promise.resolve(mock.SESSION_STATS[id] ?? mock.SESSION_STATS[1]);
  return request(`/api/sessions/${id}/stats`);
};

// GET /api/sessions/:id/feed  (polled every 5s for live updates)
// Returns: Array<{ item, time, waste }>
export const getSessionFeed = (id) => {
  if (USE_MOCK) return Promise.resolve(mock.SESSION_STATS[id]?.feed ?? []);
  return request(`/api/sessions/${id}/feed`);
};

// POST /api/sessions
// Body: { name, type, date }
export const createSession = (body) => {
  if (USE_MOCK) return Promise.resolve({ id: Date.now(), ...body });
  return request("/api/sessions", { method: "POST", body: JSON.stringify(body) });
};

// ── Reports ───────────────────────────────────────────────────────────────────

// GET /api/reports?range=today&meals=Breakfast,Lunch,Dinner
// Returns: { stats{ totalFoodKg, totalWasteKg, estimatedCost, bestMeal, deltas },
//            pie[], bar[], topWasted[] }
export const getReportData = (dateRange = "Today", meals = ["Breakfast","Lunch","Dinner"]) => {
  if (USE_MOCK) return Promise.resolve(mock.REPORT_DATA);
  const params = new URLSearchParams({
    range: dateRange.toLowerCase().replace(" ", "_"),
    meals: meals.join(","),
  });
  return request(`/api/reports?${params}`);
};

// ── AI Recommendations ────────────────────────────────────────────────────────

// POST /api/recommendations
// Body: { prompt, report_data? }
// Returns: { recommendation: string }
export const getAiRecommendation = (prompt, reportData = null) => {
  if (USE_MOCK) return Promise.resolve({
    recommendation: "Mock: Reduce pasta by 15% on weekdays. Breakfast grains are over-prepared on Tuesdays. Check storage temps for salad items.",
  });
  return request("/api/recommendations", {
    method: "POST",
    body: JSON.stringify({ prompt, report_data: reportData }),
  });
};

// ── Detection (Pi Camera) ─────────────────────────────────────────────────────

// POST /api/detect  (multipart — no JSON header)
// Body: FormData with 'file' field (image from Pi camera)
// Returns: { objects, image_base64, clustering_image_base64, waste_percentage,
//            food_area, plate_area, garbage_area }
export async function detectImage(imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);
  const res = await fetch(`${BASE}/api/detect`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ── Settings ──────────────────────────────────────────────────────────────────
// Optional: only needed if you want settings stored on the backend.
// If not, settings stay in React state (App.jsx) and are client-side only.

// GET /api/settings
export const getSettings = () => {
  if (USE_MOCK) return Promise.resolve(null);
  return request("/api/settings");
};

// POST /api/settings
export const saveSettings = (settings) => {
  if (USE_MOCK) return Promise.resolve({ ok: true });
  return request("/api/settings", { method: "POST", body: JSON.stringify(settings) });
};