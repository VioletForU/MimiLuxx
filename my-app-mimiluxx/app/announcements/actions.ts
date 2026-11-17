"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/types/roles";
import type { ActionResult } from "@/lib/types/admin";
import { ANNOUNCEMENT_GONE, validateAnnouncement, type Announcement } from "@/lib/announcements";

export type AnnouncementInput = {
  title: string;
  body: string;
  audience: string;
  priority: "critical" | "high" | "normal";
  enabled: boolean;
  is_draft: boolean;
  starts_at: string | null;
  expires_at: string | null;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "Not logged in." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAdminRole(me?.role)) return { supabase, user: null, error: "Only an Admin, President or Adviser can manage announcements." };
  return { supabase, user, error: null };
}

const friendly = (msg: string) =>
  /announcements/.test(msg) && /(exist|schema cache)/.test(msg)
    ? "The announcements table does not exist yet. Run supabase/migrations/003_integration_tables.sql."
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
      audience: input.audience,
      priority: input.priority,
      startsAt: input.starts_at,
      expiresAt: input.expires_at,
    },
    { draft: input.is_draft, checkFuture }
  );
  const first = Object.values(errors)[0];
  if (first) return { ok: false, error: first };
  return { ok: true, clean: { ...input, title: clean.title, body: clean.body } };
}

export async function createAnnouncement(input: AnnouncementInput): Promise<ActionResult> {
  const { supabase, user, error } = await requireAdmin();
  if (!user) return { ok: false, error: error! };

  const c = check(input, true);
  if (!c.ok) return c;

  const { error: dbError } = await supabase.from("announcements").insert({ ...c.clean, created_by: user.id });
  if (dbError) return { ok: false, error: friendly(dbError.message) };

  refresh();
  return { ok: true };
}

/** Full edit from the form. */
export async function editAnnouncement(id: string, input: AnnouncementInput): Promise<ActionResult> {
  const { supabase, user, error } = await requireAdmin();
  if (!user) return { ok: false, error: error! };

  // Editing an item that already started must not be blocked by an expiry that is now in the past.
  const c = check(input, false);
  if (!c.ok) return c;

  const { data, error: dbError } = await supabase.from("announcements").update(c.clean).eq("id", id).select("id");
  if (dbError) return { ok: false, error: friendly(dbError.message) };
  if (!data || data.length === 0) return { ok: false, error: ANNOUNCEMENT_GONE };

  refresh();
  return { ok: true };
}

/** Quick toggles from the list: pin, flag on/off, publish a draft. */
export async function updateAnnouncement(
  id: string,
  patch: Partial<{ enabled: boolean; pinned: boolean; is_draft: boolean }>
): Promise<ActionResult> {
  const { supabase, user, error } = await requireAdmin();
  if (!user) return { ok: false, error: error! };

  const next = { ...patch };

  if (patch.is_draft === false) {
    // Publishing a draft needs a complete message, and turns the flag on (same as the prototype).
    const { data: row } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle();
    if (!row) return { ok: false, error: ANNOUNCEMENT_GONE };
    const a = row as Announcement;
    const c = check(
      { title: a.title, body: a.body, audience: a.audience, priority: a.priority, enabled: a.enabled, is_draft: false, starts_at: a.starts_at, expires_at: a.expires_at },
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
  const { supabase, user, error } = await requireAdmin();
  if (!user) return { ok: false, error: error! };
  const { data, error: dbError } = await supabase.from("announcements").delete().eq("id", id).select("id");
  if (dbError) return { ok: false, error: friendly(dbError.message) };
  if (!data || data.length === 0) return { ok: false, error: ANNOUNCEMENT_GONE };
  refresh();
  return { ok: true };
}

/** Undo for delete: put the same row back (same id, same created_at, so it sorts where it was). */
export async function restoreAnnouncement(a: Announcement): Promise<ActionResult> {
  const { supabase, user, error } = await requireAdmin();
  if (!user) return { ok: false, error: error! };

  const c = check(
    { title: a.title, body: a.body, audience: a.audience, priority: a.priority, enabled: a.enabled, is_draft: a.is_draft, starts_at: a.starts_at, expires_at: a.expires_at },
    false
  );
  if (!c.ok) return c;

  const { error: dbError } = await supabase
    .from("announcements")
    .insert({ ...c.clean, id: a.id, pinned: a.pinned, created_at: a.created_at, created_by: user.id });
  if (dbError) return { ok: false, error: friendly(dbError.message) };

  refresh();
  return { ok: true };
}
