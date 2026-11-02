// Shared look for the admin panel. These class strings mirror the MimiLuxx landing page:
// grey canvas, white rounded cards, near-black pills, and red used only as the accent.

export const card = "rounded-3xl bg-white p-6 shadow-sm sm:p-7";
export const panel = "rounded-2xl bg-neutral-100 p-4";
export const rowItem =
  "flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5";

export const label = "text-xs font-semibold uppercase tracking-wide text-neutral-500";
export const heading = "text-xl font-extrabold tracking-tight text-neutral-900";
export const hint = "mt-1 max-w-2xl text-sm leading-relaxed text-neutral-600";

export const th =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500";
export const tableWrap = "-mx-2 mt-5 overflow-x-auto";
export const tr = "border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2323]/60 focus-visible:ring-offset-2";

export const inputClass = `rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-[#EA2323]/40 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500`;
export const darkButton = `rounded-full bg-[#1f1f1f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;
export const dangerButton = `rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-sm font-semibold text-red-700 transition hover:border-[#EA2323] hover:bg-[#EA2323] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;
export const linkDanger =
  "text-xs font-semibold text-red-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2323]/60 disabled:opacity-40";

// Segmented pill switchers (main tabs and content sections).
export const segmented = "inline-flex max-w-full flex-wrap gap-1 rounded-full bg-white/70 p-1";
export const segment = (active: boolean) =>
  `rounded-full px-5 py-2 text-sm font-semibold transition ${focusRing} ${
    active ? "bg-[#1f1f1f] text-white" : "text-neutral-700 hover:bg-white"
  }`;

// Soft badges, same palette as the "Overdue / Due soon / Upcoming" chips on the landing page.
export const badge = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
export const TONES = {
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-800",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  neutral: "bg-neutral-100 text-neutral-700",
} as const;
export type Tone = keyof typeof TONES;

export const SETUP_HINT =
  "If this is a new setup, run admin-panel-setup.sql in the Supabase SQL Editor first.";

export const errorText = "mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800";
export const emptyText = "px-4 py-8 text-center text-sm text-neutral-500";

export type Notify = (type: "success" | "error", text: string) => void;

export function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// A fixed locale and time zone, so the server and the browser print the same text.
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string) {
  return (
    new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}
