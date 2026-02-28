export default function Header({ title, children }) {
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