const NAV_ITEMS = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "sessions",  label: "Sessions",  icon: "schedule"  },
    { key: "reports",   label: "Reports",   icon: "analytics" },
    { key: "settings",  label: "Settings",  icon: "settings"  },
  ];
  
  export default function Sidebar({ active, onNavigate }) {
    return (
      <aside className="hidden md:flex flex-col w-64 p-4 gap-1 shrink-0"
        style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">Main Menu</p>
        {NAV_ITEMS.map(item => (
          <button key={item.key} onClick={() => onNavigate(item.key)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
            style={active === item.key ? { background: "#51904e", color: "#fff" } : { color: "#9ca3af" }}>
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </aside>
    );
  }