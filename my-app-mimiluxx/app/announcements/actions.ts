"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/admin";
import {
  ANNOUNCEMENT_GONE,
  committeeIdsOf,
  validateAnnouncement,
  type Announcement,
  type AnnouncementScope,
} from "@/lib/announcements";
import { getAnnouncerContext, type AnnouncerContext } from "@/lib/announcementAccess";

export type AnnouncementInput = {
  title: string;
  body: string;
  scope: AnnouncementScope;
  /** null only for scope "app" */
  organization_id: string | null;
  /** only used for scope "committees" */
  committee_ids: string[];
  priority: "critical" | "high" | "normal";
  enabled: boolean;
  is_draft: boolean;
  starts_at: string | null;
  expires_at: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAnnouncer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ctx: null, error: "Not logged in." };
  const ctx = await getAnnouncerContext(supabase, user.id);
  if (!ctx.canPost) {
    return { supabase, user: null, ctx: null, error: "Only Committee Heads and higher can create announcements." };
  }
  return { supabase, user, ctx, error: null };
}

const friendly = (msg: string) =>
  /announcement/.test(msg) && /(exist|schema cache|column)/.test(msg)
    ? "The announcement scopes are not set up yet. Run supabase/migrations/014_announcement_scopes.sql."
    : msg;

function refresh() {
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}

/** Same rules the form uses, re-checked on the server. Returns the cleaned input or an error message. */
function check(input: AnnouncementInput, checkFuture: boolean): { ok: true; clean: AnnouncementInput } | { ok: false; error: string } {
  const { errors, clean } = validateAnnouncement(
    {
      title: input.title,
      body: input.body,
      scope: input.scope,
      organizationId: input.organization_id,
      committeeIds: input.committee_ids,
      priority: input.priority,
      startsAt: input.starts_at,
      expiresAt: input.expires_at,
    },
    { draft: input.is_draft, checkFuture }
  );
  const first = Object.values(errors)[0] as string | undefined;
  if (first) return { ok: false, error: first };
  const committee_ids = input.scope === "committees" ? Array.from(new Set<string>(clean.committeeIds)) : [];
  const organization_id = input.scope === "app" ? null : input.organization_id;
  if (committee_ids.some((id) => !UUID_RE.test(id)) || (organization_id && !UUID_RE.test(organization_id))) {
    return { ok: false, error: "Pick who should see this." };
  }
  return { ok: true, clean: { ...input, title: clean.title, body: clean.body, organization_id, committee_ids } };
}

/**
 * Is this person allowed to send to this audience?
 *   app        -> Admin only
 *   org        -> Admin, or President / Adviser / VP / Secretary of that organization
 *   committees -> the same people for any committee of the organization;
 *                 a Committee Head only for their own committee
 * The database repeats these rules (014_announcement_scopes.sql).
 */
function mayTarget(ctx: AnnouncerContext, input: AnnouncementInput): string | null {
  if (input.scope === "app") return ctx.isAdmin ? null : "Only an Admin can announce to everyone in the app.";

  const target = ctx.targets.find((t) => t.orgId === input.organization_id);
  if (!target) return "You can only announce in organizations where you are a Committee Head or higher.";

  if (input.scope === "org") return target.canOrgWide ? null : "Committee Heads can only announce to their own committee.";

  const allowed = new Set(target.committees.map((c) => c.id));
  if (input.committee_ids.some((id) => !allowed.has(id))) {
    return target.canOrgWide ? "One of those committees is not in that organization." : "Committee Heads can only announce to their own committee.";
  }
  return null;
}

/** Replace the committee targets of one announcement. */
async function setCommittees(supabase: Awaited<ReturnType<typeof createClient>>, id: string, committeeIds: string[]) {
  const del = await supabase.from("announcement_committees").delete().eq("announcement_id", id);
  if (del.error) return del.error;
  if (committeeIds.length === 0) return null;
  const ins = await supabase.from("announcement_committees").insert(committeeIds.map((committee_id) => ({ announcement_id: id, committee_id })));
  return ins.error;
}

function row(c: AnnouncementInput) {
  return {
    title: c.title,
    body: c.body,
    scope: c.scope,
    organization_id: c.organization_id,
    priority: c.priority,
    enabled: c.enabled,
    is_draft: c.is_draft,
    starts_at: c.starts_at,
    expires_at: c.expires_at,
  };
}

export async function createAnnouncement(input: AnnouncementInput): Promise<ActionResult> {
  const { supabase, user, ctx, error } = await requireAnnouncer();
  if (!user || !ctx) return { ok: false, error: error! };

  const c = check(input, true);
  if (!c.ok) return c;
  const denied = mayTarget(ctx, c.clean);
  if (denied) return { ok: false, error: denied };

  const { data, error: dbError } = await supabase
    .from("announcements")
    .insert({ ...row(c.clean), created_by: user.id })
    .select("id")
    .single();
  if (dbError || !data) return { ok: false, error: friendly(dbError?.message ?? "Could not save.") };

  if (c.clean.scope === "committees") {
    const e = await setCommittees(supabase, data.id as string, c.clean.committee_ids);
    if (e) {
      await supabase.from("announcements").delete().eq("id", data.id); // do not leave a half-saved announcement
      return { ok: false, error: friendly(e.message) };
    }
  }

  refresh();
  return { ok: true };
}

/** Full edit from the form. */
export async function editAnnouncement(id: string, input: AnnouncementInput): Promise<ActionResult> {
  const { supabase, user, ctx, error } = await requireAnnouncer();
  if (!user || !ctx) return { ok: false, error: error! };

  // Editing an item that already started must not be blocked by an expiry that is now in the past.
  const c = check(input, false);
  if (!c.ok) return c;
  const denied = mayTarget(ctx, c.clean);
  if (denied) return { ok: false, error: denied };

  const { data, error: dbError } = await supabase.from("announcements").update(row(c.clean)).eq("id", id).select("id");
  if (dbError) return { ok: false, error: friendly(dbError.message) };
  if (!data || data.length === 0) return { ok: false, error: ANNOUNCEMENT_GONE };

  const e = await setCommittees(supabase, id, c.clean.scope === "committees" ? c.clean.committee_ids : []);
  if (e) return { ok: false, error: friendly(e.message) };

  refresh();
  return { ok: true };
}

/** Quick toggles from the list: pin, flag on/off, publish a draft. */
export async function updateAnnouncement(
  id: string,
  patch: Partial<{ enabled: boolean; pinned: boolean; is_draft: boolean }>
): Promise<ActionResult> {
  const { supabase, user, error } = await requireAnnouncer();
  if (!user) return { ok: false, error: error! };

  const next = { ...patch };

  if (patch.is_draft === false) {
    // Publishing a draft needs a complete message, and turns the flag on (same as the prototype).
    const { data: found } = await supabase.from("announcements").select("*, announcement_committees(committee_id)").eq("id", id).maybeSingle();
    if (!found) return { ok: false, error: ANNOUNCEMENT_GONE };
    const a = found as Announcement;
    const c = check(
      {
        title: a.title,
        body: a.body,
        scope: a.scope,
        organization_id: a.organization_id,
        committee_ids: committeeIdsOf(a),
        priority: a.priority,
        enabled: a.enabled,
        is_draft: false,
        starts_at: a.starts_at,
        expires_at: a.expires_at,
      },
      false
    );
    if (!c.ok) return { ok: false, error: `${c.error} Edit the draft first.` };
    next.enabled = true;
  }

  const { data, error: dbError } = await supabase.from("announcements").update(next).eq("id", id).select("id");
  if (dbError) return { ok: false, error: friendly(dbError.message) };
  if (!data || data.length === 0) return { ok: false, error: ANNOUNCEMENT_GONE };

  refresh();
  return { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireAnnouncer();
  if (!user) return { ok: false, error: error! };
  const { data, error: dbError } = await supabase.from("announcements").delete().eq("id", id).select("id");
  if (dbError) return { ok: false, error: friendly(dbError.message) };
  if (!data || data.length === 0) return { ok: false, error: ANNOUNCEMENT_GONE };
  refresh();
  return { ok: true };
}

/** Undo for delete: put the same row back (same id, same created_at, so it sorts where it was). */
export async function restoreAnnouncement(a: Announcement): Promise<ActionResult> {
  const { supabase, user, ctx, error } = await requireAnnouncer();
  if (!user || !ctx) return { ok: false, error: error! };

  const c = check(
    {
      title: a.title,
      body: a.body,
      scope: a.scope,
      organization_id: a.organization_id,
      committee_ids: committeeIdsOf(a),
      priority: a.priority,
      enabled: a.enabled,
      is_draft: a.is_draft,
      starts_at: a.starts_at,
      expires_at: a.expires_at,
    },
    false
  );
  if (!c.ok) return c;
  const denied = mayTarget(ctx, c.clean);
  if (denied) return { ok: false, error: denied };

  const { error: dbError } = await supabase
    .from("announcements")
    .insert({ ...row(c.clean), id: a.id, pinned: a.pinned, created_at: a.created_at, created_by: user.id });
  if (dbError) return { ok: false, error: friendly(dbError.message) };

  if (c.clean.scope === "committees") {
    const e = await setCommittees(supabase, a.id, c.clean.committee_ids);
    if (e) return { ok: false, error: friendly(e.message) };
  }

  refresh();
  return { ok: true };
}
