import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SidebarLogout from "@/app/dashboard/SidebarLogout";
import SidebarProfile from "./SidebarProfile";

export type SidebarKey = "home" | "orgs" | "tasks" | "approvals" | "announcements" | "settings" | "admin";

const ICONS = {
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  org: "M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z",
  file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  settings:
    "M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-10 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z",
  account:
    "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  logout:
    "M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
};

function Icon({ path }: { path: string }) {
  return (
    <svg className="h-6 w-6 shrink-0 text-[#E5252A]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const base = "flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-[15px] font-extrabold text-[#111111] transition";
const idle = `${base} text-[#1F1F1F] hover:bg-[#F5F5F7]`;
const current = `${base} bg-[#E5252A]/[0.08]`;

/**
 * The floating sidebar used across the app. Loads the signed-in user's profile
 * itself, so any server page/layout can drop it in: <AppSidebar active="tasks" />
 */
export default async function AppSidebar({ active }: { active?: SidebarKey }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role, full_name, email, avatar_url").eq("id", user.id).single()
    : { data: null };

  const displayName: string = profile?.full_name || profile?.email || user?.email || "";
  const initials =
    displayName
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s: string) => s[0]?.toUpperCase())
      .join("") || "ML";

  const item = (key: SidebarKey, href: string, icon: string, label: string) => (
    <Link href={href} className={active === key ? current : idle} aria-current={active === key ? "page" : undefined}>
      <Icon path={icon} />
      <span>{label}</span>
    </Link>
  );

  return (
    <aside className="flex w-full shrink-0 flex-col items-center rounded-[44px] border border-[#EDEDED] bg-white px-5 py-8 shadow-[0_15px_45px_rgba(0,0,0,0.08)] lg:w-[260px]">
      <SidebarProfile avatarUrl={profile?.avatar_url} name={displayName} initials={initials} role={profile?.role} />

      <nav className="flex w-full flex-col gap-3">
        {item("home", "/dashboard", ICONS.home, "Home")}
        {item("orgs", "/orgs", ICONS.org, "Org Page")}
        {item("tasks", "/tasks", ICONS.file, "Task Page")}
        {item("approvals", "/approvals/overdue", ICONS.check, "Approvals")}
        {item("announcements", "/announcements", ICONS.bell, "Announcements")}
        {item("settings", "/settings", ICONS.settings, "Settings")}
        <Link href="/settings" className={idle}>
          <Icon path={ICONS.account} />
          <span>Account</span>
        </Link>
        {profile?.role === "President" && item("admin", "/admin/users", ICONS.account, "Admin")}

        <SidebarLogout>
          <Icon path={ICONS.logout} />
          <span>Logout</span>
        </SidebarLogout>
      </nav>
    </aside>
  );
}
