import { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import Toggle from "../components/Toggle.jsx";

export default function Settings({ onNavigate, settings, onSave }) {
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

  return (
    <div className="min-h-screen" style={{ background: "#121212", color: "#f3f4f6", fontFamily: "'Public Sans', sans-serif" }}>
      <Header title="Settings" />

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
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(81,144,78,0.1)", color: "#51904e", border: "1px solid rgba(81,144,78,0.2)" }}>
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
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>
                  Cafeteria Name
                </label>
                <input style={inputStyle} value={draft.cafeteriaName}
                  onChange={e => setDraft(prev => ({ ...prev, cafeteriaName: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {["Breakfast","Lunch","Dinner"].map(meal => (
                  <div key={meal} className="space-y-3">
                    <p className="text-sm font-semibold">{meal}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "#6b7280" }}>Start</label>
                        <input type="time" style={{ ...inputStyle, colorScheme: "dark" }}
                          value={draft.times[meal].start}
                          onChange={e => updateTime(meal, "start", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: "#6b7280" }}>End</label>
                        <input type="time" style={{ ...inputStyle, colorScheme: "dark" }}
                          value={draft.times[meal].end}
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
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Weight Units</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Set preferred measurement unit for food waste.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: draft.units === "lbs" ? "#f3f4f6" : "#6b7280" }}>lbs</span>
                  <Toggle
                    on={draft.units === "kg"}
                    onToggle={() => setDraft(prev => ({ ...prev, units: prev.units === "kg" ? "lbs" : "kg" }))}
                  />
                  <span className="text-xs" style={{ color: draft.units === "kg" ? "#f3f4f6" : "#6b7280" }}>kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
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