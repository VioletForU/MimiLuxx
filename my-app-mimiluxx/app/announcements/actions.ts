"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/types/roles";
import type { ActionResult } from "@/lib/types/admin";

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
  if (!isAdminRole(me?.role)) return { supabase, user: null, error: "Only a President or Adviser can manage announcements." };
  return { supabase, user, error: null };
}

const friendly = (msg: string) =>
  /announcements/.test(msg) && /(exist|schema cache)/.test(msg)
    ? "The announcements table does not exist yet. Run supabase/migrations/003_integration_tables.sql."
    : msg;

export async function createAnnouncement(input: AnnouncementInput): Promise<ActionResult> {
  const { supabase, user, error } = await requireAdmin();
  if (!user) return { ok: false, error: error! };

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 80) return { ok: false, error: "Title is required (80 characters max)." };
  if (!body || body.length > 500) return { ok: false, error: "Message is required (500 characters max)." };
  if (input.starts_at && input.expires_at && new Date(input.expires_at) <= new Date(input.starts_at)) {
    return { ok: false, error: "Expiry must be after the start time." };
  }

  const { error: dbError } = await supabase.from("announcements").insert({
    title,
    body,
    audience: input.audience,
    priority: input.priority,
    enabled: input.enabled,
    is_draft: input.is_draft,
    starts_at: input.starts_at,
    expires_at: input.expires_at,
    created_by: user.id,
  });
  if (dbError) return { ok: false, error: friendly(dbError.message) };

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateAnnouncement(
  id: string,
  patch: Partial<{ enabled: boolean; pinned: boolean; is_draft: boolean }>
): Promise<ActionResult> {
  const { supabase, user, error } = await requireAdmin();
  if (!user) return { ok: false, error: error! };
  const { error: dbError } = await supabase.from("announcements").update(patch).eq("id", id);
  if (dbError) return { ok: false, error: friendly(dbError.message) };
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const { supabase, user, error } = await requireAdmin();
  if (!user) return { ok: false, error: error! };
  const { error: dbError } = await supabase.from("announcements").delete().eq("id", id);
  if (dbError) return { ok: false, error: friendly(dbError.message) };
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { ok: true };
}
