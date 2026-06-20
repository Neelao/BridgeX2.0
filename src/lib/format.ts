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

import type { ReadinessStatus, ReferralStatus } from "./types";

export const READINESS_META: Record<ReadinessStatus, { label: string; short: string; color: string; bg: string }> = {
  not_ready: { label: "Not ready", short: "Not ready", color: "#95503c", bg: "#f6eae4" },
  coaching: { label: "Needs more coaching", short: "Coaching", color: "#8c6d2c", bg: "#f6f0df" },
  employer_ready: { label: "Employer ready", short: "Ready", color: "#2f8557", bg: "#e7f5ec" },
};

export const REFERRAL_META: Record<ReferralStatus, { label: string; color: string; bg: string }> = {
  suggested: { label: "Suggested", color: "#54565f", bg: "#eceef3" },
  sent: { label: "Referred", color: "#2f7fd6", bg: "#eaf3fd" },
  interviewing: { label: "Interviewing", color: "#8c6d2c", bg: "#f6f0df" },
  placed: { label: "Placed", color: "#2f8557", bg: "#e7f5ec" },
  declined: { label: "Declined", color: "#95503c", bg: "#f6eae4" },
};

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
