import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/roles";

export async function requireRole(allowedRoles: UserRole[]) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
    redirect("/unauthorized");
  }

  return profile.role as UserRole;
}
