"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES, isPanelAdmin, type UserRole } from "@/lib/types/roles";
import type { ActionResult, DeletableKind } from "@/lib/types/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Which table each kind of deletable data lives in. Anything not listed here
// cannot be deleted through the admin panel.
const DELETABLE_TABLES: Record<DeletableKind, string> = {
  organization: "organizations",
  committee: "committees",
  proposal: "proposals",
  task: "tasks",
};

// Server actions are public HTTP endpoints, so the admin check has to live
// inside every action, not just on the page that calls them.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await createAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !isPanelAdmin(data?.role)) throw new Error("Forbidden");
  return user;
}

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

function dbMessage(error: { code?: string; message: string }, duplicate: string) {
  return error.code === "23505" ? duplicate : error.message;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function updateUserRole(userId: string, newRole: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (!UUID_RE.test(userId)) throw new Error("Invalid user id");
    if (!ROLES.includes(newRole as UserRole)) throw new Error("Invalid role");
    if (admin.id === userId) throw new Error("You cannot change your own role");

    const { error } = await createAdminClient()
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteContent(kind: DeletableKind, id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const table = DELETABLE_TABLES[kind];
    if (!table) throw new Error("Unknown kind of data");
    if (!UUID_RE.test(id)) throw new Error("Invalid id");

    const { error } = await createAdminClient().from(table).delete().eq("id", id);

    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// Creating an organization also appoints its president. The organization is
// recorded as created by the president, so it counts toward their limit and
// they show up as the owner.
export async function createOrganization(name: string, presidentId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 60) {
      throw new Error("Organization names must be 2 to 60 characters.");
    }
    const slug = slugify(clean);
    if (!slug) throw new Error("Use some letters or numbers in the name.");
    if (!UUID_RE.test(presidentId)) throw new Error("Pick who will be the president.");

    const admin = createAdminClient();
    const { data: person } = await admin.from("profiles").select("id").eq("id", presidentId).maybeSingle();
    if (!person) throw new Error("That person doesn't have an account.");

    const { data: org, error } = await admin
      .from("organizations")
      .insert({ name: clean, slug, created_by: presidentId })
      .select("id")
      .single();
    if (error || !org) {
      throw new Error(dbMessage(error ?? { message: "Could not create the organization." }, "An organization with that name already exists."));
    }

    const { error: presidentError } = await admin.rpc("set_org_president", {
      p_org: org.id,
      p_user: presidentId,
    });
    if (presidentError) {
      await admin.from("organizations").delete().eq("id", org.id);
      throw new Error(presidentError.message);
    }

    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setOrgPresident(organizationId: string, presidentId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(organizationId) || !UUID_RE.test(presidentId)) throw new Error("Invalid id");

    const admin = createAdminClient();
    const { data: person } = await admin.from("profiles").select("id").eq("id", presidentId).maybeSingle();
    if (!person) throw new Error("That person doesn't have an account.");

    const { error } = await admin.rpc("set_org_president", { p_org: organizationId, p_user: presidentId });
    if (error) throw new Error(error.message);

    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createCommittee(organizationId: string, name: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!UUID_RE.test(organizationId)) throw new Error("Invalid organization id");
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 60) {
      throw new Error("Committee names must be 2 to 60 characters.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
      .from("committees")
      .insert({ organization_id: organizationId, name: clean, created_by: user.id });

    if (error) {
      throw new Error(dbMessage(error, "That organization already has a committee with that name."));
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
