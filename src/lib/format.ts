export function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function compact(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function rel(iso: string, now: number) {
  const delta = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(delta / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 36) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function utcDay(offset: number) {
  const d = new Date();
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset);
  return new Date(utc).toISOString().slice(0, 10);
}

export function isoHoursAgo(hours: number) {
  const hour = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  return new Date(hour - hours * 3_600_000).toISOString();
}

export const COSTS = {
  mention: 0.015,
  profile: 0.01,
  graph: 0.02,
  publish: 0.02,
  ai: 0.003,
} as const;
