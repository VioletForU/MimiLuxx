import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side login check for a page. The proxy already blocks logged-out visitors;
 * this is the second lock, so a page stays protected even if the proxy rules change.
 */
export async function requireUser(returnTo?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }
  return user;
}
