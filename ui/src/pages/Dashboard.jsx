import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import { wasteColor, formatTime } from "../utils/helpers.js";
import { fetchSessionStats } from "../data/mockDb.js";

export default function Dashboard({ session, onBack, onNavigate, settings }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetchSessionStats(session.id).then(data => {
      setStats(data);
      setLoading(false);
    });

    // Poll for live feed every 5s
    const interval = setInterval(async () => {
      try {
        // TODO: uncomment when backend ready
        // const data = await fetch(`/api/sessions/${session.id}/stats`).then(r => r.json());
        // setStats(data);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [session]);

  const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " | " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const timeRange = session ? settings.times[session.type] : null;

  return (
    <div className="min-h-screen" style={{ background: "#121212", color: "#f3f4f6", fontFamily: "'Public Sans', sans-serif" }}>
      <Header title={settings.cafeteriaName}>
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

          {/* Page header */}
          <div className="mb-6">
            <button onClick={onBack} className="text-xs mb-2 flex items-center gap-1 transition-colors"
              style={{ color: "#6b7280" }}
              onMouseEnter={e => e.currentTarget.style.color = "#51904e"}
              onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}>
              ← Back to Sessions
            </button>
            <h1 className="text-3xl font-bold">{session ? session.name : "Dashboard"}</h1>
            <p className="mt-1" style={{ color: "#6b7280" }}>
              {timeRange
                ? `${formatTime(timeRange.start)} – ${formatTime(timeRange.end)}`
                : "Real-time detection and analytics"}
            </p>
          </div>

          {loading || !stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 rounded-lg animate-pulse" style={{ background: "#1C1C1C", height: 120 }} />
              ))}
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { label: "Total Items Detected", value: stats.totalItems.toLocaleString(), sub: "+12% vs avg", subColor: "#51904e", barColor: "#51904e", barWidth: "75%" },
                  { label: "Average Waste %", value: `${stats.avgWaste}%`, sub: "+2% increase", subColor: "#ef4444", barColor: "#ef4444", barWidth: `${stats.avgWaste}%` },
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

              {/* Chart + Feed */}
              <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bar chart */}
                <section className="lg:col-span-2 p-8 rounded-lg" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-semibold">Most Wasted Food Items</h2>
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
                    {[["#51904e","Low (< 15%)"],["#f59e0b","Moderate (15-30%)"],["#ef4444","High (> 30%)"]].map(([c,l]) => (
                      <div key={l} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ background: c }} />{l}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Live feed */}
                <section className="lg:col-span-1 flex flex-col rounded-lg overflow-hidden" style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <h2 className="text-lg font-semibold">Recent Detections</h2>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#51904e" }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#51904e" }} />
                    </span>
                  </div>
                  <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 460 }}>
                    {stats.feed.map((entry, i) => {
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
                  <button className="w-full py-4 text-sm font-medium transition-colors"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "#6b7280" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f3f4f6"}
                    onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}>
                    View All History
                  </button>
                </section>
              </main>
            </>
          )}

          <footer className="mt-12 text-center text-xs uppercase tracking-widest" style={{ color: "#374151" }}>
            AI Vision Waste Management System v2.4.0
          </footer>
        </div>
      </div>
    </div>
  );
}