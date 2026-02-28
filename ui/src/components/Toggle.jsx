export default function Toggle({ on, onToggle }) {
    return (
      <button onClick={onToggle}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
        style={{ background: on ? "#51904e" : "#374151" }}>
        <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
          style={{ transform: on ? "translateX(20px)" : "translateX(0px)" }} />
      </button>
    );
  }