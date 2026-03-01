import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import { wasteBadge, formatTime, getSessionImage } from "../utils/helpers.js";
import { fetchSessions } from "../data/mockDb.js";

export default function Sessions({ onSelect, onNavigate, settings }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All Sessions");
  const tabs = ["All Sessions", "Breakfast", "Lunch", "Dinner"];

  useEffect(() => {
    fetchSessions().then(data => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  const visible = filter === "All Sessions"
    ? sessions
    : sessions.filter(s => s.type === filter);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#121212", color: "#f3f4f6", fontFamily: "'Public Sans', sans-serif" }}>
      <Header title={settings.cafeteriaName}>
        <div className="hidden md:flex items-center gap-2 px-3 h-10 rounded-xl text-sm"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input placeholder="Search sessions..." className="bg-transparent text-sm outline-none w-40 placeholder-gray-500" />
        </div>
      </Header>

      <div className="flex flex-1">
        <Sidebar active="sessions" onNavigate={onNavigate} />
        <div className="flex-1 flex flex-col">

          {/* Tab bar */}
          <div className="px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex gap-8">
              {tabs.map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  className="py-4 text-sm font-bold tracking-wide transition-colors"
                  style={filter === t
                    ? { color: "#51904e", borderBottom: "2px solid #51904e" }
                    : { color: "#6b7280", borderBottom: "2px solid transparent" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
            {loading ? (
              // Loading skeletons
              [...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: "#1C1C1C", height: 300 }} />
              ))
            ) : (
              <>
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
                      <div className="h-40 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getSessionImage(session)})` }} />
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg">{session.name}</h3>
                            <p className="text-sm flex items-center gap-1 mt-0.5" style={{ color: "#6b7280" }}>
                              ⏰ {timeStr}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${b.bg} ${b.text} ${b.border}`}>
                            {session.waste}% Waste
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
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

                {/* Add new session card */}
                <div className="flex flex-col items-center justify-center rounded-xl p-8 cursor-pointer transition-all min-h-[300px]"
                  style={{ border: "2px dashed rgba(255,255,255,0.1)", background: "#1C1C1C" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#51904e"; e.currentTarget.style.background = "rgba(81,144,78,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "#1C1C1C"; }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: "rgba(81,144,78,0.15)", color: "#51904e" }}>+</div>
                  <p className="mt-4 font-bold" style={{ color: "rgba(81,144,78,0.7)" }}>Record New Session</p>
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          <div className="p-6 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-sm text-gray-500">Showing {visible.length} of {sessions.length} sessions</p>
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