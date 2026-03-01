// ── Mock Database ─────────────────────────────────────────────────────────────
// Replace these with real API calls when backend is ready.
// All fetch functions are async so swapping to real endpoints is easy.

export const SESSIONS = [
    { id: 1, name: "Oct 24 — Lunch",     type: "Lunch",     date: "2024-10-24", items: 452, waste: 12 },
    { id: 2, name: "Oct 24 — Breakfast", type: "Breakfast", date: "2024-10-24", items: 310, waste: 18 },
    { id: 3, name: "Oct 23 — Dinner",    type: "Dinner",    date: "2024-10-23", items: 528, waste: 32 },
    { id: 4, name: "Oct 23 — Lunch",     type: "Lunch",     date: "2024-10-23", items: 412, waste: 9  },
    { id: 5, name: "Oct 23 — Breakfast", type: "Breakfast", date: "2024-10-23", items: 285, waste: 24 },
  ];
  
  export const SESSION_STATS = {
    1: {
      totalItems: 452,
      avgWaste: 12,
      mostWasted: "Salad",
      chartData: [
        { label: "Salad",      pct: 28 },
        { label: "Pasta",      pct: 22 },
        { label: "Bread",      pct: 15 },
        { label: "Vegetables", pct: 10 },
        { label: "Rice",       pct: 8  },
      ],
      feed: [
        { item: "Caesar Salad",     time: "12:45 PM", waste: 28 },
        { item: "Penne Pasta",      time: "12:42 PM", waste: 22 },
        { item: "Sourdough Bread",  time: "12:38 PM", waste: 15 },
        { item: "Steamed Broccoli", time: "12:35 PM", waste: 5  },
        { item: "Steamed Rice",     time: "12:30 PM", waste: 8  },
      ],
    },
    2: {
      totalItems: 310,
      avgWaste: 18,
      mostWasted: "Oatmeal",
      chartData: [
        { label: "Oatmeal",    pct: 35 },
        { label: "Eggs",       pct: 20 },
        { label: "Toast",      pct: 18 },
        { label: "Fruit",      pct: 12 },
        { label: "Yogurt",     pct: 8  },
      ],
      feed: [
        { item: "Oatmeal",          time: "8:45 AM", waste: 35 },
        { item: "Scrambled Eggs",   time: "8:30 AM", waste: 20 },
        { item: "Whole Wheat Toast",time: "8:20 AM", waste: 18 },
        { item: "Fruit Bowl",       time: "8:10 AM", waste: 12 },
        { item: "Greek Yogurt",     time: "8:00 AM", waste: 8  },
      ],
    },
    3: {
      totalItems: 528,
      avgWaste: 32,
      mostWasted: "Pasta",
      chartData: [
        { label: "Pasta",      pct: 55 },
        { label: "Pizza",      pct: 40 },
        { label: "Vegetables", pct: 22 },
        { label: "Salad",      pct: 18 },
        { label: "Bread",      pct: 12 },
      ],
      feed: [
        { item: "Penne Arrabbiata", time: "7:45 PM", waste: 68 },
        { item: "Margherita Pizza", time: "7:30 PM", waste: 40 },
        { item: "Mashed Potatoes",  time: "7:15 PM", waste: 45 },
        { item: "Green Salad",      time: "7:00 PM", waste: 18 },
        { item: "Grilled Chicken",  time: "6:45 PM", waste: 12 },
      ],
    },
    4: {
      totalItems: 412,
      avgWaste: 9,
      mostWasted: "Rice",
      chartData: [
        { label: "Rice",       pct: 18 },
        { label: "Soup",       pct: 14 },
        { label: "Salad",      pct: 10 },
        { label: "Bread",      pct: 8  },
        { label: "Fruit",      pct: 5  },
      ],
      feed: [
        { item: "Steamed Rice",   time: "1:45 PM", waste: 18 },
        { item: "Tomato Soup",    time: "1:30 PM", waste: 14 },
        { item: "Garden Salad",   time: "1:15 PM", waste: 10 },
        { item: "Dinner Roll",    time: "1:00 PM", waste: 8  },
        { item: "Fruit Salad",    time: "12:45 PM", waste: 5 },
      ],
    },
    5: {
      totalItems: 285,
      avgWaste: 24,
      mostWasted: "Pancakes",
      chartData: [
        { label: "Pancakes",   pct: 42 },
        { label: "Bacon",      pct: 30 },
        { label: "Eggs",       pct: 18 },
        { label: "Toast",      pct: 14 },
        { label: "OJ",         pct: 8  },
      ],
      feed: [
        { item: "Pancakes",         time: "9:45 AM", waste: 42 },
        { item: "Bacon Strips",     time: "9:30 AM", waste: 30 },
        { item: "Fried Eggs",       time: "9:15 AM", waste: 18 },
        { item: "Buttered Toast",   time: "9:00 AM", waste: 14 },
        { item: "Orange Juice",     time: "8:45 AM", waste: 8  },
      ],
    },
  };
  
  export const REPORT_DATA = {
    stats: {
      totalFoodKg: 1240,
      totalWasteKg: 185,
      estimatedCost: 412.50,
      bestMeal: "Dinner",
      deltas: {
        totalFood:  "+2.1%",
        totalWaste: "-5.4%",
        cost:       "-1.2%",
        bestMeal:   "+0.8%",
      },
    },
    pie: [
      { label: "Grains",     pct: 35, color: "#51904e" },
      { label: "Vegetables", pct: 25, color: "#93c16d" },
      { label: "Proteins",   pct: 25, color: "#fbbf24" },
      { label: "Dairy",      pct: 15, color: "#ef4444" },
    ],
    bar: [
      { day: "Mon", pct: 12 },
      { day: "Tue", pct: 15 },
      { day: "Wed", pct: 22 },
      { day: "Thu", pct: 8  },
      { day: "Fri", pct: 13 },
      { day: "Sat", pct: 10 },
      { day: "Sun", pct: 7  },
    ],
    topWasted: [
      { name: "Sourdough Bread",   count: 42, avg: 18.5, trend: "+4.2%", up: true  },
      { name: "Steamed White Rice",count: 38, avg: 12.2, trend: "-2.1%", up: false },
      { name: "Greek Salad",       count: 31, avg: 15.8, trend: "+1.5%", up: true  },
      { name: "Chicken Thighs",    count: 25, avg: 8.4,  trend: "-5.2%", up: false },
      { name: "Oatmeal",           count: 22, avg: 14.1, trend: "0.0%",  up: null  },
    ],
  };
  
  // ── Fake async fetch functions (swap these with real API calls) ───────────────
  
  export async function fetchSessions() {
    // TODO: return await fetch("/api/sessions").then(r => r.json());
    await new Promise(r => setTimeout(r, 300)); // simulate network
    return SESSIONS;
  }
  
  export async function fetchSessionStats(sessionId) {
    // TODO: return await fetch(`/api/sessions/${sessionId}/stats`).then(r => r.json());
    await new Promise(r => setTimeout(r, 200));
    return SESSION_STATS[sessionId] ?? SESSION_STATS[1];
  }
  
  export async function fetchReportData(dateRange, mealFilters) {
    // TODO: return await fetch(`/api/reports?range=${dateRange}&meals=${mealFilters.join(",")}`).then(r => r.json());
    await new Promise(r => setTimeout(r, 300));
    return REPORT_DATA;
  }