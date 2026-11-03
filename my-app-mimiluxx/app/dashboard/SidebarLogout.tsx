"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SidebarLogout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-[15px] font-extrabold text-[#1F1F1F] transition hover:bg-[#F5F5F7] lg:mt-6"
    >
      {children}
    </button>
  );
}
