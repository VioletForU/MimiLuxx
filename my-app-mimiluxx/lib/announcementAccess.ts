import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Organization roles that may create announcements (Committee Head and everything above it). */
export const ANNOUNCER_ROLES = ["Committee Head", "Vice President", "Secretary", "President", "Adviser"] as const;

/**
 * Roles that may address a whole organization, or any of its committees.
 * A Committee Head is deliberately NOT here: they can only address their own committee.
 * (Keep in sync with can_target_announcement() in 014_announcement_scopes.sql.)
 */
export const ORG_WIDE_ROLES = ["Vice President", "Secretary", "President", "Adviser"] as const;

export type PostTarget = {
  orgId: string;
  orgName: string;
  /** Can send to the whole organization. */
  canOrgWide: boolean;
  /** The committees this person may pick. */
  committees: { id: string; name: string }[];
};

export type AnnouncerContext = {
  userId: string;
  isAdmin: boolean;
  /** Organizations this person can post in, with what they can pick in each. */
  targets: PostTarget[];
  /** Organizations whose announcements this person can edit / delete whoever wrote them. */
  leadOrgIds: string[];
  canPost: boolean;
};

/** Reads who the signed-in person is and where they may post. Runs as them, so row-level security applies. */
export async function getAnnouncerContext(supabase: Supabase, userId: string): Promise<AnnouncerContext> {
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
    supabase.from("organization_members").select("organization_id, role, committee_id").eq("user_id", userId),
  ]);

  const isAdmin = profile?.role === "Admin";
  const mine = (memberships ?? []) as { organization_id: string; role: string; committee_id: string | null }[];
  const eligible = mine.filter(
    (m) => (ANNOUNCER_ROLES as readonly string[]).includes(m.role) && (m.role !== "Committee Head" || !!m.committee_id)
  );

  const orgIds = eligible.map((m) => m.organization_id);
  let orgs: { id: string; name: string }[] = [];
  let committees: { id: string; name: string; organization_id: string }[] = [];
  if (isAdmin || orgIds.length > 0) {
    let orgQuery = supabase.from("organizations").select("id, name").order("name");
    let committeeQuery = supabase.from("committees").select("id, name, organization_id").order("name");
    if (!isAdmin) {
      orgQuery = orgQuery.in("id", orgIds);
      committeeQuery = committeeQuery.in("organization_id", orgIds);
    }
    const [o, c] = await Promise.all([orgQuery, committeeQuery]);
    orgs = (o.data ?? []) as typeof orgs;
    committees = (c.data ?? []) as typeof committees;
  }

  const targets: PostTarget[] = orgs.map((o) => {
    const m = eligible.find((x) => x.organization_id === o.id);
    const orgWide = isAdmin || (!!m && (ORG_WIDE_ROLES as readonly string[]).includes(m.role));
    const all = committees.filter((c) => c.organization_id === o.id).map((c) => ({ id: c.id as string, name: c.name as string }));
    return {
      orgId: o.id as string,
      orgName: o.name as string,
      canOrgWide: orgWide,
      committees: orgWide ? all : all.filter((c) => c.id === m?.committee_id),
    };
  });

  const leadOrgIds = mine
    .filter((m) => (["President", "Adviser", "Vice President", "Secretary"] as string[]).includes(m.role))
    .map((m) => m.organization_id);

  return { userId, isAdmin, targets, leadOrgIds, canPost: isAdmin || targets.length > 0 };
}
