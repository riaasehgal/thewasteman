import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import { wasteColor, formatWeight } from "../utils/helpers.js";
import { getReportData } from "../services/api.js";
import { classifyWasteCategories, generateRecommendations, askWasteAnalyst } from "../services/gemini.js";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "sessions",  label: "Sessions",  icon: "schedule"  },
  { key: "reports",   label: "Reports",   icon: "analytics" },
  { key: "settings",  label: "Settings",  icon: "settings"  },
];

const COLORS = ["#51904e","#93c16d","#fbbf24","#ef4444","#3b82f6"];

export default function Reports({ onNavigate, settings }) {
  const [dateRange, setDateRange]       = useState("Today");
  const [mealFilters, setMealFilters]   = useState({ Breakfast: true, Lunch: true, Dinner: true });
  const [report, setReport]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // AI state
  const [pieCategories, setPieCategories]     = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [aiDataLoading, setAiDataLoading]     = useState(false);

  // Chat state
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I can answer questions about your cafeteria waste data. Try asking me why certain items are wasted more, or what days are worst." }
  ]);
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef  = useRef(null);
  // Keep a ref to messages so handleChat always sees the latest value (fixes stale closure)
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Keep a ref to report too so handleChat always sees latest report
  const reportRef = useRef(report);
  useEffect(() => { reportRef.current = report; }, [report]);

  // Load report data
  useEffect(() => {
    setLoading(true);
    setError(null);
    const activeMeals = Object.keys(mealFilters).filter(m => mealFilters[m]);
    getReportData(dateRange, activeMeals)
      .then(data => {
        setReport(data);
        setLoading(false);
        runAiAnalysis(data);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [dateRange, mealFilters]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function runAiAnalysis(data) {
    setAiDataLoading(true);
    setPieCategories(null);
    setRecommendations(null);
    try {
      const [cats, recs] = await Promise.all([
        classifyWasteCategories(data.topWasted),
        generateRecommendations(data),
      ]);
      setPieCategories(cats);
      setRecommendations(recs);
    } catch (err) {
      console.error("AI analysis failed:", err);
      // Fallback to static data
      setPieCategories(data.pie);
      setRecommendations([
        { type: "Portion Control",   color: "#51904e", text: "Reduce pasta serving sizes by 15% to mitigate high plate waste." },
        { type: "Inventory Alert",   color: "#3b82f6", text: "Review storage conditions for salad categories; spoilage is increasing." },
        { type: "Prep Optimization", color: "#51904e", text: "Adjust breakfast grain volume based on low attendance on Tuesdays." },
      ]);
    }
    setAiDataLoading(false);
  }

  // useCallback so the function identity is stable, but reads from refs to avoid stale closure
  const handleChat = useCallback(async () => {
    const currentMessages = messagesRef.current;
    const currentReport   = reportRef.current;
    const userMsg = chatInput.trim();

    if (!userMsg || chatLoading || !currentReport) return;

    setChatInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      // Build history: skip the initial assistant greeting (index 0), map to Anthropic roles
      const history = currentMessages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const reply = await askWasteAnalyst(userMsg, currentReport, history);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    }

    setChatLoading(false);
  }, [chatInput, chatLoading]); // chatInput IS a dep here because we read it directly

  function toggleMeal(meal) {
    setMealFilters(prev => ({ ...prev, [meal]: !prev[meal] }));
  }

  // Build pie chart gradient from AI categories or fallback
  const pieData = pieCategories ?? report?.pie ?? [];
  const pieGrad = pieData.reduce((acc, slice, i, arr) => {
    const prev = arr.slice(0, i).reduce((s, x) => s + x.pct, 0);
    return acc + `${slice.color} ${prev}% ${prev + slice.pct}%${i < arr.length - 1 ? ", " : ""}`;
  }, "");

  const maxBar = report ? Math.max(...report.bar.map(b => b.pct)) : 1;

  return (
    <div className="min-h-screen" style={{ background: "#121212", color: "#f3f4f6", fontFamily: "'Public Sans', sans-serif" }}>
      <Header title="Reports">
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
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 p-4 gap-1 shrink-0"
          style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
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

          {loading && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl animate-pulse" style={{ background: "#1C1C1C", height: 120 }} />
              ))}
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm py-10 text-center">Failed to load report: {error}</div>
          )}

          {!loading && !error && report && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Food Processed",    value: formatWeight(report.stats.totalFoodKg,  settings.units), delta: report.stats.deltas.totalFood,  deltaColor: "#51904e", icon: "⚖️" },
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
                {/* AI-classified Pie chart */}
                <div className="p-6 rounded-xl" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">Waste Distribution by Food Category</h3>
                    {aiDataLoading && (
                      <span className="text-xs px-2 py-1 rounded-full animate-pulse"
                        style={{ background: "rgba(81,144,78,0.1)", color: "#51904e" }}>
                        ✨ AI classifying...
                      </span>
                    )}
                  </div>
                  {aiDataLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="w-48 h-48 rounded-full animate-pulse" style={{ background: "#2D2D2D" }} />
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
                      <div className="w-48 h-48 rounded-full relative flex items-center justify-center shrink-0"
                        style={{ background: `conic-gradient(${pieGrad})` }}>
                        <div className="w-28 h-28 rounded-full" style={{ background: "#1C1C1C" }} />
                      </div>
                      <div className="space-y-3">
                        {pieData.map(slice => (
                          <div key={slice.label} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: slice.color }} />
                            <span className="text-sm" style={{ color: "#d1d5db" }}>{slice.label} ({slice.pct}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

              {/* Table + AI Recommendations */}
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
                    {aiDataLoading && (
                      <span className="text-xs px-2 py-1 rounded-full animate-pulse ml-auto"
                        style={{ background: "rgba(81,144,78,0.1)", color: "#51904e" }}>
                        Analysing data...
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {aiDataLoading ? (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.03)", height: 64 }} />
                      ))
                    ) : (
                      (recommendations ?? []).map((rec, i) => (
                        <div key={i} className="p-4 rounded-lg flex gap-3"
                          style={{ background: rec.color + "0d", border: `1px solid ${rec.color}22` }}>
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: rec.color }} />
                          <p className="text-sm" style={{ color: "#d1d5db" }}>
                            <span className="font-semibold text-white">{rec.type}: </span>{rec.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* AI Chatbot */}
              <div className="rounded-xl flex flex-col" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="p-5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span>🤖</span>
                  <h3 className="text-lg font-bold">Ask About Your Data</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full ml-2"
                    style={{ background: "rgba(81,144,78,0.1)", color: "#51904e", border: "1px solid rgba(81,144,78,0.2)" }}>
                    Claude
                  </span>
                </div>

                {/* Messages */}
                <div className="flex flex-col gap-3 p-5 overflow-y-auto" style={{ maxHeight: 320 }}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm"
                        style={msg.role === "user"
                          ? { background: "#51904e", color: "#fff", borderBottomRightRadius: 4 }
                          : { background: "rgba(255,255,255,0.06)", color: "#d1d5db", borderBottomLeftRadius: 4 }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-2xl text-sm flex gap-1" style={{ background: "rgba(255,255,255,0.06)", borderBottomLeftRadius: 4 }}>
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#6b7280", animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#6b7280", animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#6b7280", animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleChat()}
                    placeholder="Ask about waste patterns, trends, or suggestions..."
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", color: "#f3f4f6" }}
                    disabled={chatLoading || !report}
                  />
                  <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: chatLoading || !chatInput.trim() ? "rgba(81,144,78,0.3)" : "#51904e",
                      color: "#fff",
                      cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer"
                    }}>
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}