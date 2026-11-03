import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrgCarousel, { type OrgCard } from "./OrgCarousel";

export default async function OrgsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>Not logged in</p>
        <Link href="/login" className="underline">Go to login</Link>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("name", { ascending: true });

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-ink">
      <header className="flex select-none flex-col items-center pt-[clamp(1.5rem,5vh,3.5rem)] text-center">
        <h1 className="text-[clamp(28px,2.6vw,42px)] font-black leading-none tracking-tight">
          Mimi<span className="text-brand">Luxx</span>
        </h1>
        <p className="mt-1 text-[clamp(14px,1.2vw,20px)] font-semibold">Community</p>
      </header>

      {error && <p className="mt-6 text-center text-sm text-red-700">Could not load organizations: {error.message}</p>}

      {!error && (data ?? []).length === 0 ? (
        <div className="mt-24 text-center text-neutral-500">
          <p>No organizations yet.</p>
          <Link href="/admin/users" className="mt-2 inline-block text-sm underline">Create one in the admin panel</Link>
        </div>
      ) : (
        <OrgCarousel orgs={(data ?? []) as OrgCard[]} />
      )}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-[clamp(1rem,4vh,2.5rem)] z-40 mx-auto flex w-max items-center gap-6 rounded-md bg-white px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
      >
        <Link href="/dashboard" aria-label="Home" className="text-sm font-extrabold text-brand transition hover:scale-110">Home</Link>
        <span aria-current="page" className="text-sm font-extrabold">Org Page</span>
        <Link href="/tasks" className="text-sm font-extrabold transition hover:scale-110">Task Page</Link>
        <Link href="/settings" className="text-sm font-extrabold transition hover:scale-110">Settings</Link>
      </nav>
    </div>
  );
}
