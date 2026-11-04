"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/types/roles";
import type { ActionResult } from "@/lib/types/admin";
import type { ApprovalLimit } from "@/lib/approvalLimits";

export async function saveLimits(limits: ApprovalLimit[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not logged in." };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!isAdminRole(me?.role)) return { ok: false, error: "Only a President or Adviser can change time limits." };

  for (const l of limits) {
    if (!Number.isInteger(l.amount) || l.amount < 1) return { ok: false, error: `${l.role}: the limit must be at least 1.` };
    if (!Number.isInteger(l.repeat_hours) || l.repeat_hours < 0) return { ok: false, error: `${l.role}: repeat hours cannot be negative.` };
  }

  const { error } = await supabase
    .from("approval_time_limits")
    .upsert(limits.map((l) => ({ ...l, updated_at: new Date().toISOString() })), { onConflict: "role" });
  if (error) {
    return {
      ok: false,
      error: /approval_time_limits/.test(error.message)
        ? "The approval_time_limits table does not exist yet. Run supabase/migrations/003_integration_tables.sql."
        : error.message,
    };
  }

  revalidatePath("/approvals/overdue");
  return { ok: true };
}

export async function runCheckNow(): Promise<ActionResult> {
  revalidatePath("/approvals/overdue");
  return { ok: true };
}
