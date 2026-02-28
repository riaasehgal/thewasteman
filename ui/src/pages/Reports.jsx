import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import { wasteColor, formatWeight } from "../utils/helpers.js";
import { fetchReportData } from "../data/mockDb.js";

const API = "https://jr3-api.joaopferreira.me/api";

export default function Reports({ onNavigate, settings }) {
  const [dateRange, setDateRange] = useState("Today");
  const [mealFilters, setMealFilters] = useState({ Breakfast: true, Lunch: true, Dinner: true });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  // Fetch report data when date range or meal filters change
  useEffect(() => {
    setLoading(true);
    const activeMeals = Object.keys(mealFilters).filter(m => mealFilters[m]);
    fetchReportData(dateRange, activeMeals).then(data => {
      setReport(data);
      setLoading(false);
    });
  }, [dateRange, mealFilters]);

  function toggleMeal(meal) {
    setMealFilters(prev => ({ ...prev, [meal]: !prev[meal] }));
  }

  async function handleAiSubmit() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse(null);

    try {
      // TODO: uncomment when Gemini backend is ready
      // const res = await fetch(`${API}/recommendations`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ prompt: aiPrompt, reportData: report }),
      // });
      // const data = await res.json();
      // setAiResponse(data.recommendation);

      // Mock response for now
      await new Promise(r => setTimeout(r, 1500));
      setAiResponse("Based on current waste patterns, consider reducing pasta portions by 15% on weekdays. Breakfast grains show consistent over-preparation on Tuesdays — prep 20% less. Green Salad spoilage suggests a storage temperature issue worth investigating.");
    } catch (err) {
      setAiResponse("Failed to get recommendations. Please try again.");
    }

    setAiLoading(false);
    setAiPrompt("");
  }

  // Build pie chart gradient
  const pieGrad = report?.pie.reduce((acc, slice, i, arr) => {
    const prev = arr.slice(0, i).reduce((s, x) => s + x.pct, 0);
    return acc + `${slice.color} ${prev}% ${prev + slice.pct}%${i < arr.length - 1 ? ", " : ""}`;
  }, "") ?? "";

  const maxBar = report ? Math.max(...report.bar.map(b => b.pct)) : 1;

  return (
    <div className="min-h-screen" style={{ background: "#121212", color: "#f3f4f6", fontFamily: "'Public Sans', sans-serif" }}>
      <Header title="Reports">
        {/* Date range selector */}
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
        {/* Sidebar with meal filters */}
        <aside className="hidden md:flex flex-col w-64 p-4 gap-1 shrink-0"
          style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">Main Menu</p>
          {[
            { key: "dashboard", label: "Dashboard", icon: "dashboard" },
            { key: "sessions",  label: "Sessions",  icon: "schedule"  },
            { key: "reports",   label: "Reports",   icon: "analytics" },
            { key: "settings",  label: "Settings",  icon: "settings"  },
          ].map(item => (
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
          {loading || !report ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-6 rounded-xl animate-pulse" style={{ background: "#1C1C1C", height: 120 }} />
              ))}
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Food Processed",    value: formatWeight(report.stats.totalFoodKg, settings.units),  delta: report.stats.deltas.totalFood,  deltaColor: "#51904e", icon: "⚖️" },
                  { label: "Total Waste Detected",    value: formatWeight(report.stats.totalWasteKg, settings.units), delta: report.stats.deltas.totalWaste, deltaColor: "#ef4444", icon: "🗑️" },
                  { label: "Estimated Cost of Waste", value: `$${report.stats.estimatedCost.toFixed(2)}`,             delta: report.stats.deltas.cost,       deltaColor: "#ef4444", icon: "💵" },
                  { label: "Best Performing Meal",    value: report.stats.bestMeal,                                   delta: report.stats.deltas.bestMeal,   deltaColor: "#51904e", icon: "⭐" },
                ].map(s => (
                  <div key={s.label} className="p-6 rounded-xl flex flex-col gap-2"
                    style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xl">{s.icon}</span>
                      <span className="text-sm font-bold" style={{ color: s.deltaColor }}>{s.delta}</span>
                    </div>
                    <p className="text-sm" style={{ color: "#9ca3af" }}>{s.label}</p>
                    <p className="text-3xl font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Pie + Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Donut chart */}
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

                {/* Bar chart */}
                <div className="p-6 rounded-xl" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <h3 className="text-lg font-bold mb-8">Waste % Trend Over Time</h3>
                  <div className="flex items-end gap-2 h-40 px-2">
                    {report.bar.map(b => {
                      const c = wasteColor(b.pct);
                      return (
                        <div key={b.day} className="flex-1 flex flex-col items-center gap-1 group">
                          <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c }}>{b.pct}%</span>
                          <div className="w-full rounded-t-lg" style={{ height: `${(b.pct / maxBar) * 100}%`, background: c + "88", minHeight: 4 }} />
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

              {/* Table + AI */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top wasted table */}
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
                          <td className="py-3 text-sm font-bold"
                            style={{ color: row.up === null ? "#6b7280" : row.up ? "#ef4444" : "#51904e" }}>
                            {row.up === null ? "→" : row.up ? "↑" : "↓"} {row.trend}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Recommendations */}
                <div className="p-6 rounded-xl flex flex-col" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2 mb-5">
                    <span>✨</span>
                    <h3 className="text-lg font-bold">AI-Powered Recommendations</h3>
                  </div>

                  <div className="space-y-3 flex-1">
                    {/* Static default recommendations */}
                    {[
                      { type: "Portion Control",   color: "#51904e", text: "Reduce pasta serving sizes by 15% to mitigate high plate waste." },
                      { type: "Inventory Alert",   color: "#3b82f6", text: "Review storage conditions for 'Green Salad' categories; spoilage is increasing." },
                      { type: "Prep Optimization", color: "#51904e", text: "Adjust 'Breakfast Grains' volume based on low attendance patterns on Tuesdays/Wednesdays." },
                    ].map((rec, i) => (
                      <div key={i} className="p-4 rounded-lg flex gap-3"
                        style={{ background: rec.color + "0d", border: `1px solid ${rec.color}22` }}>
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: rec.color }} />
                        <p className="text-sm" style={{ color: "#d1d5db" }}>
                          <span className="font-semibold text-white">{rec.type}: </span>{rec.text}
                        </p>
                      </div>
                    ))}

                    {aiLoading && (
                      <div className="p-4 rounded-lg flex gap-3 animate-pulse"
                        style={{ background: "rgba(81,144,78,0.05)", border: "1px solid rgba(81,144,78,0.15)" }}>
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#51904e" }} />
                        <p className="text-sm text-gray-500">Generating recommendations...</p>
                      </div>
                    )}

                    {aiResponse && (
                      <div className="p-4 rounded-lg flex gap-3"
                        style={{ background: "rgba(147,193,109,0.08)", border: "1px solid rgba(147,193,109,0.25)" }}>
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#93c16d" }} />
                        <p className="text-sm" style={{ color: "#d1d5db" }}>
                          <span className="font-semibold text-white">Gemini: </span>{aiResponse}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Prompt input */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}