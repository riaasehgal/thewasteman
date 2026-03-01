export function wasteBadge(pct) {
  if (pct < 15) return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" };
  if (pct < 30) return { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20"   };
  return           { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/20"    };
}

export function wasteColor(pct) {
  if (pct < 15) return "#51904e";
  if (pct < 30) return "#f59e0b";
  return "#ef4444";
}

export function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatWeight(val, units) {
  if (units === "lbs") return `${(val * 2.205).toFixed(0)} lbs`;
  return `${val.toLocaleString()} kg`;
}

export const BREAKFAST_IMGS = [
  "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400",
  "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400",
  "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
  "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400",
  "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400",
  "https://images.unsplash.com/photo-1494597564530-871f2b93ac55?w=400",
  "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=400",
  "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=400",
];

export const LUNCH_IMGS = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
  "https://images.unsplash.com/photo-1473093226555-0465b66fd45d?w=400",
  "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400",
];

export const DINNER_IMGS = [
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
  "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400",
  "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400",
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
  "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400",
  "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=400",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
];

export function getSessionImage(session) {
  const imgs = session.type === "Breakfast" ? BREAKFAST_IMGS
    : session.type === "Lunch" ? LUNCH_IMGS : DINNER_IMGS;
  return imgs[session.id % 8];
}