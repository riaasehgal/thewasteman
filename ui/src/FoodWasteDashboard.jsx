import { useState, useEffect, useRef } from "react";

const API = "https://jr3-api.joaopferreira.me/api";

function wasteBadge(pct) {
  if (pct < 15) return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" };
  if (pct < 30) return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" };
  return { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" };
}

function wasteColor(pct) {
  if (pct < 15) return "#51904e";
  if (pct < 30) return "#f59e0b";
  return "#ef4444";
}

// ── Default Settings ──────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  cafeteriaName: "Central Station",
  units: "kg",
  darkMode: true,
  times: {
    Breakfast: { start: "07:00", end: "10:00" },
    Lunch:     { start: "11:30", end: "14:30" },
    Dinner:    { start: "17:00", end: "20:00" },
  },
};

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour < 12 ? "AM" : "PM"}`;
}

const MOCK_SESSIONS = [
  { id: 1, name: "Oct 24 — Lunch",     type: "Lunch",     items: 452, waste: 12 },
  { id: 2, name: "Oct 24 — Breakfast", type: "Breakfast", items: 310, waste: 18 },
  { id: 3, name: "Oct 23 — Dinner",    type: "Dinner",    items: 528, waste: 32 },
  { id: 4, name: "Oct 23 — Lunch",     type: "Lunch",     items: 412, waste: 9  },
  { id: 5, name: "Oct 23 — Breakfast", type: "Breakfast", items: 285, waste: 24 },
];

const MOCK_STATS = {
  totalItems: 1245,
  avgWaste: 24,
  mostWasted: "Pasta",
  chartData: [
    { label: "Pasta",      pct: 42 },
    { label: "Pizza",      pct: 28 },
    { label: "Vegetables", pct: 18 },
    { label: "Salad",      pct: 12 },
    { label: "Bread",      pct: 8  },
  ],
  feed: [
    { item: "Mashed Potatoes",  time: "12:45 PM", waste: 45 },
    { item: "Grilled Chicken",  time: "12:42 PM", waste: 12 },
    { item: "Penne Arrabbiata", time: "12:38 PM", waste: 68 },
    { item: "Steamed Broccoli", time: "12:35 PM", waste: 5  },
    { item: "Margherita Pizza", time: "12:30 PM", waste: 24 },
    { item: "Green Salad",      time: "12:28 PM", waste: 15 },
  ],
};

const MOCK_REPORT = {
  stats: [
    { label: "Total Food Processed",    value: "1,240 kg", delta: "+2.1%", deltaColor: "#51904e", icon: "⚖️" },
    { label: "Total Waste Detected",    value: "185 kg",   delta: "-5.4%", deltaColor: "#ef4444", icon: "🗑️" },
    { label: "Estimated Cost of Waste", value: "$412.50",  delta: "-1.2%", deltaColor: "#ef4444", icon: "💵" },
    { label: "Best Performing Meal",    value: "Dinner",   delta: "+0.8%", deltaColor: "#51904e", icon: "⭐" },
  ],
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
  recommendations: [
    { type: "Portion Control",   color: "#51904e", text: "Reduce pasta serving sizes by 15% to mitigate high plate waste." },
    { type: "Inventory Alert",   color: "#3b82f6", text: "Review storage conditions for 'Green Salad' categories; spoilage is increasing." },
    { type: "Prep Optimization", color: "#51904e", text: "Adjust 'Breakfast Grains' volume based on low attendance patterns on Tuesdays/Wednesdays." },
  ],
};

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "sessions",  label: "Sessions",  icon: "schedule"  },
  { key: "reports",   label: "Reports",   icon: "analytics" },
  { key: "settings",  label: "Settings",  icon: "settings"  },
];

// ── Shared Components ─────────────────────────────────────────────────────────
function Sidebar({ active, onNavigate }) {
  return (
    <aside className="hidden md:flex flex-col w-64 p-4 gap-1 shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
      <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">Main Menu</p>
      {NAV_ITEMS.map(item => (
        <button key={item.key} onClick={() => onNavigate(item.key)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
          style={active === item.key ? { background: "#51904e", color: "#fff" } : { color: "#9ca3af" }}>
          <span className="material-symbols-outlined text-xl">{item.icon}</span>{item.label}
        </button>
      ))}
    </aside>
  );
}

function Header({ title, onNavigate, children }) {
  return (
    <header style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#121212" }}
      className="flex items-center justify-between px-6 md:px-10 py-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <img src="/src/assets/wastemanlogo.png" className="w-10 h-10 object-contain" />
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </header>
  );
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
      style={{ background: on ? "#51904e" : "#374151" }}>
      <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
        style={{ transform: on ? "translateX(20px)" : "translateX(0px)" }} />
    </button>
  );
}

// ── Sessions Screen ───────────────────────────────────────────────────────────
function SessionsScreen({ onSelect, onNavigate, settings }) {
  const [filter, setFilter] = useState("All Sessions");
  const tabs = ["All Sessions", "Breakfast", "Lunch", "Dinner"];
  const visible = filter === "All Sessions" ? MOCK_SESSIONS : MOCK_SESSIONS.filter(s => s.type === filter);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#121212", color: "#f3f4f6", fontFamily: "'Public Sans', sans-serif" }}>
      <Header title={settings.cafeteriaName} onNavigate={onNavigate}>
        <div className="hidden md:flex items-center gap-2 px-3 h-10 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input placeholder="Search sessions..." className="bg-transparent text-sm outline-none w-40 placeholder-gray-500" />
        </div>
      </Header>

      <div className="flex flex-1">
        <Sidebar active="sessions" onNavigate={onNavigate} />
        <div className="flex-1 flex flex-col">
          <div className="px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex gap-8">
              {tabs.map(t => (
                <button key={t} onClick={() => setFilter(t)} className="py-4 text-sm font-bold tracking-wide transition-colors"
                  style={filter === t ? { color: "#51904e", borderBottom: "2px solid #51904e" } : { color: "#6b7280", borderBottom: "2px solid transparent" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
            {visible.map(session => {
              const b = wasteBadge(session.waste);
              const timeRange = settings.times[session.type];
              const timeStr = `${formatTime(timeRange.start)} - ${formatTime(timeRange.end)}`;
              return (
                <div key={session.id} onClick={() => onSelect(session)}
                  className="cursor-pointer rounded-xl overflow-hidden transition-all"
                  style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseEnter={e => e.currentTarget.style.outline = "2px solid rgba(81,144,78,0.5)"}
                  onMouseLeave={e => e.currentTarget.style.outline = "none"}>
                  <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${
                    session.type === "Breakfast"
                      ? ["https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400",
                         "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400",
                         "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
                         "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400",
                         "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400",
                         "https://images.unsplash.com/photo-1494597564530-871f2b93ac55?w=400",
                         "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=400",
                         "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=400"][session.id % 8]
                    : session.type === "Lunch"
                      ? ["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
                         "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
                         "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
                         "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400",
                         "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400",
                         "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
                         "https://images.unsplash.com/photo-1473093226555-0465b66fd45d?w=400",
                         "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400"][session.id % 8]
                      : ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
                         "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400",
                         "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400",
                         "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
                         "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400",
                         "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400",
                         "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400",
                         "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400"][session.id % 8]
                  })` }} />
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{session.name}</h3>
                        <p className="text-sm flex items-center gap-1 mt-0.5" style={{ color: "#6b7280" }}>⏰ {timeStr}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${b.bg} ${b.text} ${b.border}`}>
                        {session.waste}% Waste
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6b7280" }}>Total Items</p>
                        <p className="font-semibold">{session.items}</p>
                      </div>
                      <span style={{ color: "#51904e" }}>→</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-col items-center justify-center rounded-xl p-8 cursor-pointer transition-all min-h-[300px]"
              style={{ border: "2px dashed rgba(255,255,255,0.1)", background: "#1C1C1C" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#51904e"; e.currentTarget.style.background = "rgba(81,144,78,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "#1C1C1C"; }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(81,144,78,0.15)", color: "#51904e" }}>+</div>
              <p className="mt-4 font-bold" style={{ color: "rgba(81,144,78,0.7)" }}>Record New Session</p>
            </div>
          </div>

          <div className="p-6 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-sm text-gray-500">Showing {visible.length} of 24 sessions</p>
            <div className="flex gap-2">
              {["‹","›"].map(ch => (
                <button key={ch} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#51904e"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}>
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Screen ──────────────────────────────────────────────────────────
function DashboardScreen({ session, onBack, onNavigate, settings }) {
  const [stats] = useState(MOCK_STATS);
  const [feed, setFeed] = useState(MOCK_STATS.feed);
  const feedRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // const res = await fetch(`${API}/logs?session_id=${session.id}`);
        // const data = await res.json();
        // setFeed(data.logs);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [session]);

  const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " | " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const timeRange = session ? settings.times[session.type] : null;

  return (
    <div className="min-h-screen" style={{ background: "#121212", color: "#f3f4f6", fontFamily: "'Public Sans', sans-serif" }}>
      <Header title={settings.cafeteriaName} onNavigate={onNavigate}>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{ background: "rgba(81,144,78,0.1)", border: "1px solid rgba(81,144,78,0.2)", color: "#51904e" }}>
            <span className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse" style={{ background: "#51904e" }} />
            Live
          </div>
          <span className="text-sm hidden md:block" style={{ color: "#6b7280" }}>{now}</span>
        </div>
      </Header>

      <div className="flex">
        <Sidebar active="dashboard" onNavigate={onNavigate} />
        <div className="flex-1 p-6 md:p-10">
          <div className="mb-6">
            <button onClick={onBack} className="text-xs mb-2 flex items-center gap-1 transition-colors"
              style={{ color: "#6b7280" }}
              onMouseEnter={e => e.currentTarget.style.color = "#51904e"}
              onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}>
              ← Back to Sessions
            </button>
            <h1 className="text-3xl font-bold">{session ? session.name : "Food Waste Monitor"}</h1>
            <p className="mt-1" style={{ color: "#6b7280" }}>
              {timeRange ? `${formatTime(timeRange.start)} – ${formatTime(timeRange.end)}` : "Real-time detection and analytics dashboard"}
            </p>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: "Total Items Detected Today", value: stats.totalItems.toLocaleString(), sub: "+12% vs avg", subColor: "#51904e", barColor: "#51904e", barWidth: "75%" },
              { label: `Average Waste %`, value: `${stats.avgWaste}%`, sub: "+2% increase", subColor: "#ef4444", barColor: "#ef4444", barWidth: `${stats.avgWaste}%` },
              { label: "Most Wasted Item", value: stats.mostWasted, sub: "Target for portion adjustment", icon: true },
            ].map(card => (
              <div key={card.label} className="p-6 rounded-lg" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-sm font-medium mb-1" style={{ color: "#9ca3af" }}>{card.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{card.value}</span>
                  {card.icon && (
                    <div className="ml-2 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                      <svg className="w-5 h-5" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    </div>
                  )}
                  {!card.icon && <span className="text-xs font-bold" style={{ color: card.subColor }}>{card.sub}</span>}
                </div>
                {card.barColor && (
                  <div className="mt-4 h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: card.barWidth, background: card.barColor }} />
                  </div>
                )}
                {card.icon && <p className="text-xs uppercase tracking-widest mt-4" style={{ color: "#4b5563" }}>{card.sub}</p>}
              </div>
            ))}
          </section>

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2 p-8 rounded-lg" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-semibold">Most Wasted Food Items Today</h2>
                <select className="text-xs rounded-md px-2 py-1 outline-none"
                  style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}>
                  <option>All Stations</option><option>Hot Bar</option><option>Salad Bar</option>
                </select>
              </div>
              <div className="space-y-5">
                {stats.chartData.map(row => {
                  const c = wasteColor(row.pct);
                  return (
                    <div key={row.label} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: "#d1d5db" }}>{row.label}</span>
                        <span className="font-mono font-bold" style={{ color: c }}>{row.pct}%</span>
                      </div>
                      <div className="h-6 w-full rounded overflow-hidden" style={{ background: "#2D2D2D" }}>
                        <div className="h-full rounded" style={{ width: `${row.pct}%`, background: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 pt-5 flex gap-5 text-xs flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#6b7280" }}>
                {[["#51904e","Low Waste (< 15%)"],["#f59e0b","Moderate (15-30%)"],["#ef4444","High Waste (> 30%)"]].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ background: c }} />{l}
                  </div>
                ))}
              </div>
            </section>

            <section className="lg:col-span-1 flex flex-col rounded-lg overflow-hidden" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <h2 className="text-lg font-semibold">Recent Detections</h2>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#51904e" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#51904e" }} />
                </span>
              </div>
              <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 460 }}>
                {feed.map((entry, i) => {
                  const c = wasteColor(entry.waste);
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-md"
                      style={{ background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${c}` }}>
                      <div>
                        <p className="font-medium text-sm">{entry.item}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{entry.time}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm" style={{ color: c }}>{entry.waste}%</span>
                        <p className="text-xs uppercase tracking-wider" style={{ color: "#4b5563" }}>Waste</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="w-full py-4 text-sm font-medium transition-colors" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#6b7280" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f3f4f6"}
                onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}>
                View All History
              </button>
            </section>
          </main>
          <footer className="mt-12 text-center text-xs uppercase tracking-widest" style={{ color: "#374151" }}>
            AI Vision Waste Management System v2.4.0
          </footer>
        </div>
      </div>
    </div>
  );
}

// ── Reports Screen ────────────────────────────────────────────────────────────
function ReportsScreen({ onNavigate, settings }) {
  const [dateRange, setDateRange] = useState("Today");
  const [mealFilters, setMealFilters] = useState({ Breakfast: true, Lunch: true, Dinner: true });
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const report = MOCK_REPORT;
  const maxBar = Math.max(...report.bar.map(b => b.pct));

  function toggleMeal(meal) {
    setMealFilters(prev => ({ ...prev, [meal]: !prev[meal] }));
  }

  async function handleAiSubmit() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    // TODO: replace with real Gemini API call
    // const res = await fetch(`${API}/recommendations`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ prompt: aiPrompt }) });
    // const data = await res.json();
    // setAiResponse(data.recommendation);
    await new Promise(r => setTimeout(r, 1500));
    setAiResponse("Based on current waste patterns, consider reducing pasta portions by 15% on weekdays. Breakfast grains show consistent over-preparation on Tuesdays — prep 20% less. Green Salad spoilage suggests a storage temperature issue worth investigating.");
    setAiLoading(false);
    setAiPrompt("");
  }

  let pieGrad = "";
  let cumulative = 0;
  report.pie.forEach(slice => {
    pieGrad += `${slice.color} ${cumulative}% ${cumulative + slice.pct}%, `;
    cumulative += slice.pct;
  });
  pieGrad = pieGrad.slice(0, -2);

  return (
    <div className="min-h-screen" style={{ background: "#121212", color: "#f3f4f6", fontFamily: "'Public Sans', sans-serif" }}>
      <Header title="Reports" onNavigate={onNavigate}>
        <div className="flex p-1 rounded-xl gap-1" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.08)" }}>
          {["Today","Past Week","Past Month","All Time"].map(r => (
            <button key={r} onClick={() => setDateRange(r)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={dateRange === r ? { background: "#51904e", color: "#fff" } : { color: "#6b7280" }}>
              {r}
            </button>
          ))}
        </div>
      </Header>

      <div className="flex">
        <aside className="hidden md:flex flex-col w-64 p-4 gap-1 shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">Main Menu</p>
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => onNavigate(item.key)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
              style={item.key === "reports" ? { background: "#51904e", color: "#fff" } : { color: "#9ca3af" }}>
              <span className="material-symbols-outlined text-xl">{item.icon}</span>{item.label}
            </button>
          ))}
          <p className="px-3 py-2 mt-4 text-xs font-bold uppercase tracking-wider text-gray-500">Meal Filters</p>
          {["Breakfast","Lunch","Dinner"].map(meal => (
            <label key={meal} className="flex items-center gap-3 px-3 py-2 cursor-pointer" onClick={() => toggleMeal(meal)}>
              <div className="w-4 h-4 rounded flex items-center justify-center transition-all"
                style={{ background: mealFilters[meal] ? "#51904e" : "transparent", border: `2px solid ${mealFilters[meal] ? "#51904e" : "#4b5563"}` }}>
                {mealFilters[meal] && <span className="text-white text-xs leading-none">✓</span>}
              </div>
              <span className="text-sm font-medium select-none" style={{ color: "#d1d5db" }}>{meal}</span>
            </label>
          ))}
        </aside>

        <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {report.stats.map(s => (
              <div key={s.label} className="p-6 rounded-xl flex flex-col gap-2" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-sm font-bold" style={{ color: s.deltaColor }}>{s.delta}</span>
                </div>
                <p className="text-sm" style={{ color: "#9ca3af" }}>{s.label}</p>
                <p className="text-3xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-xl" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 className="text-lg font-bold mb-8">Waste Distribution by Food Category</h3>
              <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
                <div className="w-48 h-48 rounded-full relative flex items-center justify-center shrink-0"
                  style={{ background: `conic-gradient(${pieGrad})` }}>
                  <div className="w-28 h-28 rounded-full" style={{ background: "#1C1C1C" }} />
                </div>
                <div className="space-y-3">
                  {report.pie.map(slice => (
                    <div key={slice.label} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: slice.color }} />
                      <span className="text-sm" style={{ color: "#d1d5db" }}>{slice.label} ({slice.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 className="text-lg font-bold mb-8">Waste % Trend Over Time</h3>
              <div className="flex items-end gap-2 h-40 px-2">
                {report.bar.map(b => {
                  const c = wasteColor(b.pct);
                  const heightPct = (b.pct / maxBar) * 100;
                  return (
                    <div key={b.day} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c }}>{b.pct}%</span>
                      <div className="w-full rounded-t-lg" style={{ height: `${heightPct}%`, background: c + "88", minHeight: 4 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-3 px-2">
                {report.bar.map(b => (
                  <span key={b.day} className="flex-1 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#6b7280" }}>{b.day}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-6 rounded-xl" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Top 5 Most Wasted Items</h3>
                <button className="text-sm font-bold" style={{ color: "#51904e" }}>Download CSV</button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {["Food Name","Occurrences","Avg Waste %","Trend"].map(h => (
                      <th key={h} className="py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#6b7280" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.topWasted.map(row => (
                    <tr key={row.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td className="py-3 text-sm font-medium">{row.name}</td>
                      <td className="py-3 text-sm" style={{ color: "#d1d5db" }}>{row.count}</td>
                      <td className="py-3 text-sm" style={{ color: "#d1d5db" }}>{row.avg}%</td>
                      <td className="py-3 text-sm font-bold" style={{ color: row.up === null ? "#6b7280" : row.up ? "#ef4444" : "#51904e" }}>
                        {row.up === null ? "→" : row.up ? "↑" : "↓"} {row.trend}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 rounded-xl flex flex-col" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2 mb-5">
                <span>✨</span>
                <h3 className="text-lg font-bold">AI-Powered Recommendations</h3>
              </div>
              <div className="space-y-3 flex-1">
                {report.recommendations.map((rec, i) => (
                  <div key={i} className="p-4 rounded-lg flex gap-3"
                    style={{ background: rec.color + "0d", border: `1px solid ${rec.color}22` }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: rec.color }} />
                    <p className="text-sm" style={{ color: "#d1d5db" }}>
                      <span className="font-semibold text-white">{rec.type}: </span>{rec.text}
                    </p>
                  </div>
                ))}
                {aiLoading && (
                  <div className="p-4 rounded-lg flex gap-3 animate-pulse" style={{ background: "rgba(81,144,78,0.05)", border: "1px solid rgba(81,144,78,0.15)" }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#51904e" }} />
                    <p className="text-sm text-gray-500">Generating recommendations...</p>
                  </div>
                )}
                {aiResponse && (
                  <div className="p-4 rounded-lg flex gap-3" style={{ background: "rgba(147,193,109,0.08)", border: "1px solid rgba(147,193,109,0.25)" }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#93c16d" }} />
                    <p className="text-sm" style={{ color: "#d1d5db" }}>
                      <span className="font-semibold text-white">Gemini: </span>{aiResponse}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-5 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}>
                <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAiSubmit()}
                  placeholder="Ask AI about your waste data..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", color: "#f3f4f6" }} />
                <button onClick={handleAiSubmit} disabled={aiLoading}
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{ background: aiLoading ? "rgba(81,144,78,0.4)" : "#51904e", color: "#fff", cursor: aiLoading ? "not-allowed" : "pointer" }}>
                  {aiLoading ? "..." : "Ask"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings Screen ───────────────────────────────────────────────────────────
function SettingsScreen({ onNavigate, settings, onSave }) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(settings)));
  const [saved, setSaved] = useState(false);

  function updateTime(meal, field, value) {
    setDraft(prev => ({
      ...prev,
      times: { ...prev.times, [meal]: { ...prev.times[meal], [field]: value } }
    }));
  }

  function handleSave() {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputStyle = {
    background: "#121212",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f3f4f6",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "14px",
    outline: "none",
    width: "100%",
  };

  const timeInputStyle = {
    ...inputStyle,
    width: "100%",
    colorScheme: "dark",
  };

  return (
    <div className="min-h-screen" style={{ background: "#121212", color: "#f3f4f6", fontFamily: "'Public Sans', sans-serif" }}>
      <Header title="Settings" onNavigate={onNavigate} />

      <div className="flex">
        <Sidebar active="settings" onNavigate={onNavigate} />

        <div className="flex-1 p-6 md:p-10 space-y-8">

          {/* Camera & Detection */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="p-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 className="text-lg font-semibold">Camera & Detection</h3>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Configure your hardware monitoring devices.</p>
            </div>
            <div className="p-6 flex items-center justify-between">
              <span className="text-sm font-medium">Primary Device</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(81,144,78,0.1)", color: "#51904e", border: "1px solid rgba(81,144,78,0.2)" }}>
                Pi Camera
              </span>
            </div>
          </div>

          {/* Session Settings */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="p-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 className="text-lg font-semibold">Session Settings</h3>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Manage location name and meal time ranges.</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Cafeteria Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>Cafeteria Name</label>
                <input style={inputStyle} value={draft.cafeteriaName}
                  onChange={e => setDraft(prev => ({ ...prev, cafeteriaName: e.target.value }))} />
              </div>

              {/* Time ranges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {["Breakfast","Lunch","Dinner"].map(meal => (
                  <div key={meal} className="space-y-3">
                    <p className="text-sm font-semibold">{meal}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "#6b7280" }}>Start</label>
                        <input type="time" style={timeInputStyle} value={draft.times[meal].start}
                          onChange={e => updateTime(meal, "start", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "#6b7280" }}>End</label>
                        <input type="time" style={timeInputStyle} value={draft.times[meal].end}
                          onChange={e => updateTime(meal, "end", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Display */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="p-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 className="text-lg font-semibold">Display</h3>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Personalize your application experience.</p>
            </div>
            <div className="p-6 divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {/* Units */}
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium">Weight Units</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Set preferred measurement unit for food waste.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: draft.units === "lbs" ? "#f3f4f6" : "#6b7280" }}>lbs</span>
                  <Toggle on={draft.units === "kg"} onToggle={() => setDraft(prev => ({ ...prev, units: prev.units === "kg" ? "lbs" : "kg" }))} />
                  <span className="text-xs" style={{ color: draft.units === "kg" ? "#f3f4f6" : "#6b7280" }}>kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-2 pb-10">
            <button onClick={handleSave}
              className="px-8 py-3 rounded-lg font-semibold text-white transition-all"
              style={{ background: saved ? "#3e6e3c" : "#51904e", boxShadow: "0 4px 20px rgba(81,144,78,0.3)" }}>
              {saved ? "✓ Saved!" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("sessions");
  const [activeSession, setActiveSession] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  function handleNavigate(key) {
    if (key === "sessions") setActiveSession(null);
    setScreen(key);
  }

  if (screen === "sessions")  return <SessionsScreen onSelect={s => { setActiveSession(s); setScreen("dashboard"); }} onNavigate={handleNavigate} settings={settings} />;
  if (screen === "dashboard") return <DashboardScreen session={activeSession} onBack={() => setScreen("sessions")} onNavigate={handleNavigate} settings={settings} />;
  if (screen === "reports")   return <ReportsScreen onNavigate={handleNavigate} settings={settings} />;
  if (screen === "settings")  return <SettingsScreen onNavigate={handleNavigate} settings={settings} onSave={s => { setSettings(s); }} />;
  return <SessionsScreen onSelect={s => { setActiveSession(s); setScreen("dashboard"); }} onNavigate={handleNavigate} settings={settings} />;
}