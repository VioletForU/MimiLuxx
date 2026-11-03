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
