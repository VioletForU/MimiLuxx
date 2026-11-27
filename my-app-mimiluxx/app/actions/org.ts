"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/siteUrl";
import { ORG_ASSIGNABLE_ROLES, type UserRole } from "@/lib/types/roles";
import type { OrgActionResult } from "@/lib/types/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(e: unknown): OrgActionResult {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

function isAssignable(role: string) {
  return (ORG_ASSIGNABLE_ROLES as string[]).includes(role);
}

/**
 * Server actions are public endpoints, so every action re-checks that the
 * caller is this organization's president (or an Admin). The writes then run as
 * the signed-in person, so the database's own rules apply as a second check.
 */
async function requireOrgManager(organizationId: string) {
  if (!UUID_RE.test(organizationId)) throw new Error("Invalid organization id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  if (membership?.role !== "President" && profile?.role !== "Admin") throw new Error("Forbidden");
  return { supabase, user };
}

function refresh() {
  revalidatePath("/orgs/[slug]/manage", "page");
}

// ------------------------------------------------------------- committees --

export async function addCommittee(organizationId: string, name: string): Promise<OrgActionResult> {
  try {
    const { supabase, user } = await requireOrgManager(organizationId);
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 60) throw new Error("Committee names must be 2 to 60 characters.");

    const { error } = await supabase
      .from("committees")
      .insert({ organization_id: organizationId, name: clean, created_by: user.id });
    if (error) {
      throw new Error(
        error.code === "23505" ? "This organization already has a committee with that name." : error.message
      );
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeCommittee(organizationId: string, committeeId: string): Promise<OrgActionResult> {
  try {
    const { supabase } = await requireOrgManager(organizationId);
    if (!UUID_RE.test(committeeId)) throw new Error("Invalid committee id");

    const { error } = await supabase
      .from("committees")
      .delete()
      .eq("id", committeeId)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------- members --

async function checkCommittee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  committeeId: string | null
) {
  if (!committeeId) return null;
  if (!UUID_RE.test(committeeId)) throw new Error("Invalid committee id");
  const { data } = await supabase
    .from("committees")
    .select("id")
    .eq("id", committeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!data) throw new Error("That committee isn't part of this organization.");
  return committeeId;
}

export async function inviteMember(
  organizationId: string,
  rawEmail: string,
  role: UserRole,
  committeeId: string | null
): Promise<OrgActionResult> {
  try {
    const { supabase, user } = await requireOrgManager(organizationId);
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
    if (!isAssignable(role)) throw new Error("That role can't be given by invite.");
    const committee = await checkCommittee(supabase, organizationId, committeeId);

    const admin = createAdminClient();

    // Already has an account: add them straight away (there is no mailer for
    // existing users, and the president knows who they are inviting).
    const { data: existingId } = await admin.rpc("find_user_id_by_email", { p_email: email });
    if (existingId) {
      const { error } = await supabase.from("organization_members").insert({
        organization_id: organizationId,
        user_id: existingId,
        role,
        committee_id: committee,
      });
      if (error) {
        throw new Error(error.code === "23505" ? "That person is already a member." : error.message);
      }
      refresh();
      return { ok: true, message: `${email} already has an account, so they were added right away.` };
    }

    // New person: record the invite, then email them. They join automatically
    // the first time they sign in (claim_my_invites).
    const { data: invite, error: inviteError } = await supabase
      .from("organization_invites")
      .insert({ organization_id: organizationId, email, role, committee_id: committee, invited_by: user.id })
      .select("id")
      .single();
    if (inviteError || !invite) {
      throw new Error(
        inviteError?.code === "23505"
          ? "That email already has a pending invite."
          : inviteError?.message ?? "Could not save the invite."
      );
    }

    const local = email.split("@")[0].replace(/[^A-Za-z0-9_.]/g, "").slice(0, 12) || "member";
    const username = `${local}${Math.random().toString(36).slice(2, 6)}`;
    const { error: mailError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
      data: { full_name: local, username },
    });
    if (mailError) {
      await supabase.from("organization_invites").delete().eq("id", invite.id);
      throw new Error(`Could not send the email: ${mailError.message}`);
    }

    refresh();
    return { ok: true, message: `Invite sent to ${email}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeInvite(organizationId: string, inviteId: string): Promise<OrgActionResult> {
  try {
    const { supabase } = await requireOrgManager(organizationId);
    if (!UUID_RE.test(inviteId)) throw new Error("Invalid invite id");
    const { error } = await supabase
      .from("organization_invites")
      .delete()
      .eq("id", inviteId)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateMember(
  organizationId: string,
  memberId: string,
  changes: { role?: UserRole; committeeId?: string | null }
): Promise<OrgActionResult> {
  try {
    const { supabase } = await requireOrgManager(organizationId);
    if (!UUID_RE.test(memberId)) throw new Error("Invalid member id");

    const update: { role?: string; committee_id?: string | null } = {};
    if (changes.role !== undefined) {
      if (!isAssignable(changes.role)) throw new Error("That role can't be given here.");
      update.role = changes.role;
    }
    if (changes.committeeId !== undefined) {
      update.committee_id = await checkCommittee(supabase, organizationId, changes.committeeId);
    }
    if (Object.keys(update).length === 0) return { ok: true };

    // The president's own row is protected by the database rules, so this
    // matches nobody if memberId is the president.
    const { data, error } = await supabase
      .from("organization_members")
      .update(update)
      .eq("id", memberId)
      .eq("organization_id", organizationId)
      .neq("role", "President")
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("That member can't be changed here.");
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeMember(organizationId: string, memberId: string): Promise<OrgActionResult> {
  try {
    const { supabase } = await requireOrgManager(organizationId);
    if (!UUID_RE.test(memberId)) throw new Error("Invalid member id");
    const { data, error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", memberId)
      .eq("organization_id", organizationId)
      .neq("role", "President")
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("That member can't be removed here.");
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
