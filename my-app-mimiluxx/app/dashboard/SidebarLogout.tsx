"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SidebarLogout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[14px] font-bold text-[#3A3A3F] transition hover:bg-[#F4F4F6] hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111] disabled:opacity-50 lg:mt-3 lg:w-full lg:border-t lg:border-[#F0F0F2] lg:pt-4"
    >
      {children}
    </button>
  );
}
