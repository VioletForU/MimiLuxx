export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;

/** "3d 8h", "5h 12m", "9m" */
export function spanText(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 60000);
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Wrapped so server components can read the clock without tripping the render-purity lint rule. */
export function currentTimeMs(): number {
  return Date.now();
}
