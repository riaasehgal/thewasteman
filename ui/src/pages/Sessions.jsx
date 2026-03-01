import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import { wasteBadge, formatTime, getSessionImage } from "../utils/helpers.js";
import { getSessions, createSession } from "../services/api.js";

export default function Sessions({ onSelect, onNavigate, settings }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All Sessions");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Lunch");
  const tabs = ["All Sessions", "Breakfast", "Lunch", "Dinner"];

  function loadSessions() {
    setLoading(true);
    getSessions().then(data => {
      setSessions(data);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load sessions:", err);
      setLoading(false);
    });
  }

  useEffect(() => { loadSessions(); }, []);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const name = newName.trim() || `${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${newType}`;
      const result = await createSession({ name, meal_type: newType });
      setShowModal(false);
      setNewName("");
      setNewType("Lunch");
      // Navigate directly to the live dashboard for this new session
      onSelect({
        id: result.session_id,
        name: result.name || name,
        type: newType,
        date: new Date().toISOString().split("T")[0],
        items: 0,
        waste: 0,
        active: true,
        start_time: result.start_time,
        end_time: null,
      });
    } catch (err) {
      console.error("Failed to create session:", err);
      alert("Failed to create session: " + err.message);
    }
    setCreating(false);
  }

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
                <div onClick={() => setShowModal(true)}
                  className="flex flex-col items-center justify-center rounded-xl p-8 cursor-pointer transition-all min-h-[300px]"
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

      {/* Create Session Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowModal(false)}>
          <div className="rounded-2xl p-8 w-full max-w-md space-y-6"
            style={{ background: "#1C1C1C", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold">New Session</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "#9ca3af" }}>Session Name (optional)</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder={`${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${newType}`}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", color: "#f3f4f6" }} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "#9ca3af" }}>Meal Type</label>
              <div className="flex gap-2">
                {["Breakfast", "Lunch", "Dinner"].map(t => (
                  <button key={t} onClick={() => setNewType(t)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={newType === t
                      ? { background: "#51904e", color: "#fff" }
                      : { background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: creating ? "rgba(81,144,78,0.3)" : "#51904e", color: "#fff", cursor: creating ? "not-allowed" : "pointer" }}>
                {creating ? "Starting..." : "Start Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}