// ── API Service ───────────────────────────────────────────────────────────────
// All backend calls live here. Pages NEVER call fetch() directly.
// The Vite dev server proxies /api → http://localhost:3001

const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ── Sessions ──────────────────────────────────────────────────────────────────

// GET /api/sessions?limit=50
// Returns the sessions array from { sessions, total, limit, offset }
export async function getSessions() {
  const data = await request("/api/sessions?limit=50");
  return data.sessions.map(formatSessionForUI);
}

// GET /api/sessions/:session_id
// Returns session detail with detection results, formatted for the dashboard
export async function getSessionStats(sessionId) {
  const data = await request(`/api/sessions/${sessionId}`);
  return formatSessionStatsForUI(data);
}

// POST /api/sessions/start
// Body: { name, meal_type }
export async function createSession({ name, meal_type }) {
  return request("/api/sessions/start", {
    method: "POST",
    body: JSON.stringify({ name, meal_type }),
  });
}

// POST /api/sessions/:session_id/stop
export async function stopSession(sessionId) {
  return request(`/api/sessions/${sessionId}/stop`, { method: "POST" });
}

// GET /api/sessions/active
export async function getActiveSession() {
  return request("/api/sessions/active");
}

// ── Reports ───────────────────────────────────────────────────────────────────

// GET /api/reports — the backend doesn't have a reports endpoint yet,
// so we build report data client-side from sessions + detections.
export async function getReportData(dateRange = "Today", meals = ["Breakfast", "Lunch", "Dinner"]) {
  const { sessions } = await request("/api/sessions?limit=50");

  // Filter by meal type
  const filtered = sessions.filter(s => {
    const mt = s.meal_type || guessMealType(s.start_time);
    return meals.includes(mt);
  });

  // Aggregate stats
  let totalItems = 0;
  let totalWasteKg = 0;
  const categoryTotals = {};
  const mealTotals = {};

  for (const s of filtered) {
    const items = s.summary?.total_items ?? 0;
    totalItems += items;
    const breakdown = s.summary?.category_breakdown ?? {};
    for (const [cat, count] of Object.entries(breakdown)) {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + count;
    }
    // Accumulate per category kg from categories array
    if (s.categories) {
      for (const c of s.categories) {
        totalWasteKg += c.total_kg ?? 0;
      }
    }
    const mt = s.meal_type || guessMealType(s.start_time);
    mealTotals[mt] = (mealTotals[mt] || 0) + items;
  }

  const totalFoodKg = Math.max(totalWasteKg * 3, 1); // rough estimate
  const bestMeal = Object.entries(mealTotals).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "N/A";

  // Build pie chart data
  const totalCats = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
  const pieColors = ["#51904e", "#93c16d", "#fbbf24", "#ef4444", "#3b82f6"];
  const pie = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count], i) => ({
      label,
      pct: Math.round((count / totalCats) * 100),
      color: pieColors[i % pieColors.length],
    }));

  // Build bar chart (waste per day)
  const dayMap = {};
  for (const s of filtered) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", { weekday: "short" });
    dayMap[day] = (dayMap[day] || 0) + (s.summary?.total_items ?? 0);
  }
  const bar = Object.entries(dayMap).map(([day, pct]) => ({ day, pct }));

  // Top wasted items
  const topWasted = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      avg: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
      trend: "—",
      up: null,
    }));

  return {
    stats: {
      totalFoodKg: Math.round(totalFoodKg),
      totalWasteKg: Math.round(totalWasteKg * 100) / 100,
      estimatedCost: totalWasteKg * 2.5,
      bestMeal,
      deltas: { totalFood: "—", totalWaste: "—", cost: "—", bestMeal: "—" },
    },
    pie,
    bar: bar.length > 0 ? bar : [{ day: "Today", pct: 0 }],
    topWasted,
  };
}

// ── AI Recommendations ────────────────────────────────────────────────────────

export const getAiRecommendation = (prompt, reportData = null) => {
  return request("/api/recommendations", {
    method: "POST",
    body: JSON.stringify({ prompt, report_data: reportData }),
  });
};

// ── Detection (Pi Camera) ─────────────────────────────────────────────────────

export async function detectImage(imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);
  const url = `/api/detect`.startsWith("http") ? `/api/detect` : `${API_BASE}/api/detect`;
  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ── Data transformers ─────────────────────────────────────────────────────────

function guessMealType(startTime) {
  if (!startTime) return "Lunch";
  const hour = new Date(startTime).getHours();
  if (hour < 11) return "Breakfast";
  if (hour < 15) return "Lunch";
  return "Dinner";
}

function formatSessionForUI(session) {
  const date = session.start_time ? session.start_time.split("T")[0] : new Date().toISOString().split("T")[0];
  const mealType = session.meal_type || guessMealType(session.start_time);
  const d = new Date(session.start_time);
  const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const autoName = `${dateLabel} — ${mealType}`;

  const totalItems = session.summary?.total_items ?? 0;
  // Compute a simple "waste" metric from categories
  const totalKg = (session.categories ?? []).reduce((s, c) => s + (c.total_kg ?? 0), 0);
  const waste = totalKg > 0 ? Math.min(Math.round(totalKg * 10), 100) : 0;

  return {
    id: session.session_id,
    name: session.name || autoName,
    type: mealType,
    date,
    items: totalItems,
    waste,
    active: !session.end_time,
    start_time: session.start_time,
    end_time: session.end_time,
  };
}

function formatSessionStatsForUI(session) {
  const results = session.results ?? [];
  const totalItems = results.length;

  // Category breakdown
  const catCounts = {};
  let totalKg = 0;
  for (const r of results) {
    catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    totalKg += r.amount_kg ?? 0;
  }

  const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const mostWasted = sorted[0]?.[0] ?? "None";
  const totalCount = sorted.reduce((s, [, c]) => s + c, 0) || 1;

  const chartData = sorted.slice(0, 5).map(([label, count]) => ({
    label,
    pct: Math.round((count / totalCount) * 100),
  }));

  const avgWaste = totalKg > 0 ? Math.round((totalKg / totalItems) * 100) : 0;

  // Build feed from results (most recent first)
  const feed = results.slice(-10).reverse().map((r, i) => ({
    item: r.category,
    time: session.start_time
      ? new Date(new Date(session.start_time).getTime() + i * 60000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "",
    waste: r.amount_kg ? Math.round(r.amount_kg * 100) : Math.round((r.confidence ?? 0) * 100),
  }));

  return { totalItems, avgWaste, mostWasted, chartData, feed };
}