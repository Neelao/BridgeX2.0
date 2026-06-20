export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relative(ts: number): string {
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const unit = mins < 60 ? `${mins}m` : hours < 24 ? `${hours}h` : `${days}d`;
  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function scoreBand(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Strong fit", color: "#5c7656", bg: "#eef2ea" };
  if (score >= 60) return { label: "Developing", color: "#8c6d2c", bg: "#f6f0df" };
  return { label: "Needs work", color: "#95503c", bg: "#f6eae4" };
}

// Deterministic avatar color from a string — muted "ink wash" tones.
export function avatarColor(seed: string): string {
  const colors = ["#6d8196", "#6f8b68", "#a8843a", "#b0604a", "#5b6e7e", "#7c7a68", "#876f8a"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}
