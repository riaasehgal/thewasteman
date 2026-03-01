import { useState } from "react";
import Sessions  from "./pages/Sessions.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Reports   from "./pages/Reports.jsx";
import Settings  from "./pages/Settings.jsx";

const DEFAULT_SETTINGS = {
  cafeteriaName: "Central Station",
  units: "kg",
  times: {
    Breakfast: { start: "07:00", end: "10:00" },
    Lunch:     { start: "11:30", end: "14:30" },
    Dinner:    { start: "17:00", end: "20:00" },
  },
};

export default function App() {
  const [screen, setScreen]           = useState("sessions");
  const [activeSession, setActiveSession] = useState(null);
  const [settings, setSettings]       = useState(DEFAULT_SETTINGS);

  function handleNavigate(key) {
    if (key === "sessions") setActiveSession(null);
    setScreen(key);
  }

  const props = { onNavigate: handleNavigate, settings };

  if (screen === "sessions")  return <Sessions  {...props} onSelect={s => { setActiveSession(s); setScreen("dashboard"); }} />;
  if (screen === "dashboard") return <Dashboard {...props} session={activeSession} onBack={() => setScreen("sessions")} />;
  if (screen === "reports")   return <Reports   {...props} />;
  if (screen === "settings")  return <Settings  {...props} onSave={s => setSettings(s)} />;
}