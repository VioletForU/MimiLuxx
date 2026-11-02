import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client that uses the secret (service role) key.
 * It bypasses Row Level Security, so only use it after confirming the
 * signed-in user is a President or Adviser. Never import this from a
 * "use client" file.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "The admin panel is not configured: SUPABASE_SERVICE_ROLE_KEY is missing on the server."
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
