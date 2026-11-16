export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  priority: "critical" | "high" | "normal";
  pinned: boolean;
  enabled: boolean;
  is_draft: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type AnnouncementStatus = "active" | "scheduled" | "disabled" | "draft" | "expired";

export function statusOf(a: Announcement, now: number): AnnouncementStatus {
  if (a.is_draft) return "draft";
  if (!a.enabled) return "disabled";
  if (a.expires_at && new Date(a.expires_at).getTime() <= now) return "expired";
  if (a.starts_at && new Date(a.starts_at).getTime() > now) return "scheduled";
  return "active";
}

const PRIO = { critical: 0, high: 1, normal: 2 } as const;

/** Pinned first, then priority (critical → normal), then newest. */
export function sortAnnouncements(list: Announcement[]): Announcement[] {
  return [...list].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      PRIO[a.priority] - PRIO[b.priority] ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/** Which audiences a role may see. */
export function visibleTo(a: Announcement, role: string): boolean {
  if (a.audience === "All members") return true;
  if (a.audience === "Committee Heads") return role === "Committee Head" || role === "President" || role === "Adviser";
  if (a.audience === "Presidents") return role === "President" || role === "Adviser";
  return true;
}

/* ───────────── Shared with the form AND the server actions ─────────────
   Ported from public/feat_flagged_announcement_ui/announcement-flag-ui.js
   (validation, Philippine-time handling, "when" text). */

export const TZ = "Asia/Manila";
export const AUDIENCES = ["All members", "Committee Heads", "Presidents"] as const;
export const PRIORITIES = ["critical", "high", "normal"] as const;
export const LIMITS = { titleMin: 3, titleMax: 80, bodyMin: 10, bodyMax: 500 } as const;
export const ANNOUNCEMENT_GONE = "That announcement no longer exists.";

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** <input type="datetime-local"> value ("2026-11-05T14:30") → ISO string. Always read as Philippine time (+08:00). */
export function manilaLocalToIso(local: string): string | null {
  if (!local || !LOCAL_DT.test(local)) return null;
  const ms = Date.parse(`${local}:00+08:00`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

const manilaParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ISO string → value for <input type="datetime-local">, in Philippine time. */
export function isoToManilaLocal(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const p = Object.fromEntries(manilaParts.formatToParts(ms).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const shortFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fullFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const yearFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" });

/** "Nov 5, 2:30 PM" (adds the year when it is not the current one). Same output on server and client. */
export function formatWhen(iso: string, now: number): string {
  const ms = Date.parse(iso);
  return (yearFmt.format(ms) === yearFmt.format(now) ? shortFmt : fullFmt).format(ms);
}

/** "Starts Nov 5, 2:30 PM" / "Ends …" / "Ended …" / "Started …" / "No dates set" */
export function whenText(a: Pick<Announcement, "starts_at" | "expires_at">, now: number): string {
  const s = a.starts_at ? Date.parse(a.starts_at) : NaN;
  const e = a.expires_at ? Date.parse(a.expires_at) : NaN;
  if (a.starts_at && s > now) return `Starts ${formatWhen(a.starts_at, now)}`;
  if (a.expires_at) return e <= now ? `Ended ${formatWhen(a.expires_at, now)}` : `Ends ${formatWhen(a.expires_at, now)}`;
  if (a.starts_at) return `Started ${formatWhen(a.starts_at, now)}`;
  return "No dates set";
}

export type AnnouncementField = "title" | "body" | "audience" | "priority" | "dates";
export type AnnouncementErrors = Partial<Record<AnnouncementField, string>>;

export type AnnouncementValues = {
  title: string;
  body: string;
  audience: string;
  priority: string;
  /** ISO strings (or null) */
  startsAt: string | null;
  expiresAt: string | null;
};

/**
 * One rule set for the form and the server.
 * draft: a draft may skip the "future expiry" check and the 10-character message minimum
 *        (the database still needs a non-empty message).
 */
export function validateAnnouncement(
  v: AnnouncementValues,
  { draft = false, checkFuture = true, now = Date.now() }: { draft?: boolean; checkFuture?: boolean; now?: number } = {}
): { errors: AnnouncementErrors; clean: AnnouncementValues } {
  const errors: AnnouncementErrors = {};
  const clean: AnnouncementValues = {
    ...v,
    title: v.title.trim().replace(/\s+/g, " "),
    body: v.body.trim(),
  };

  if (!clean.title) errors.title = "Give the announcement a title.";
  else if (clean.title.length < LIMITS.titleMin) errors.title = `Title needs at least ${LIMITS.titleMin} characters.`;
  else if (clean.title.length > LIMITS.titleMax) errors.title = `Title can be at most ${LIMITS.titleMax} characters.`;

  if (clean.body.length > LIMITS.bodyMax) errors.body = `Message can be at most ${LIMITS.bodyMax} characters.`;
  else if (!clean.body) errors.body = draft ? "Add at least a few words, even for a draft." : "Write the message members will read.";
  else if (!draft && clean.body.length < LIMITS.bodyMin) errors.body = `Message needs at least ${LIMITS.bodyMin} characters.`;

  if (!(AUDIENCES as readonly string[]).includes(clean.audience)) errors.audience = "Pick who should see this.";
  if (!(PRIORITIES as readonly string[]).includes(clean.priority)) errors.priority = "Pick a priority.";

  const s = clean.startsAt ? Date.parse(clean.startsAt) : null;
  const e = clean.expiresAt ? Date.parse(clean.expiresAt) : null;
  if ((s !== null && Number.isNaN(s)) || (e !== null && Number.isNaN(e))) errors.dates = "Enter a valid date and time.";
  else if (s !== null && e !== null && e <= s) errors.dates = "Expiry must be after the start time.";
  else if (!draft && checkFuture && e !== null && e <= now) errors.dates = "Expiry must be in the future.";

  return { errors, clean };
}
