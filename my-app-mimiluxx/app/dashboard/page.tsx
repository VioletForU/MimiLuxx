import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTaskPriority } from "@/lib/priority";
import { routeStages } from "@/lib/stageRouting";
import type { Proposal, ApprovalStage } from "@/lib/types/proposal";
import ProposalsPanel, { type ProposalRow } from "./ProposalsPanel";
import SidebarLogout from "./SidebarLogout";
import { sortAnnouncements, statusOf, visibleTo, type Announcement } from "@/lib/announcements";

type Props = { searchParams: Promise<{ tab?: string }> };

/* ---------- Icons (from public/main_dashboard_page.html) ---------- */
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

function Icon({ path, className = "h-6 w-6 shrink-0 text-[#E5252A]" }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const navItemClass =
  "flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-[15px] font-extrabold text-[#1F1F1F] transition hover:bg-[#F5F5F7]";

const PRIORITY_BADGE: Record<string, string> = {
  Overdue: "bg-red-100 text-red-700",
  "Due Today": "bg-orange-100 text-orange-700",
  "Due Soon": "bg-yellow-100 text-yellow-700",
  Upcoming: "bg-blue-100 text-blue-700",
  "No Deadline": "bg-gray-100 text-gray-600",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Completed",
};

/* ---------- Tasks view: Quick Access + Recent ---------- */
async function TasksContent({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);

  const rankedTasks = (tasks ?? [])
    .map((task) => ({ ...task, priority: getTaskPriority(task.due_date) }))
    .sort((a, b) => b.priority.score - a.priority.score);

  // Placeholder folder cards matching the 8 quick access slots
  const quickAccessFolders = Array.from({ length: 8 }, (_, idx) => ({
    id: idx + 1,
    name: "Org Name",
    description: "Description",
  }));

  return (
    <div className="flex flex-col gap-9">
      {/* QUICK ACCESS */}
      <section>
        <h2 className="mb-5 text-[28px] font-black tracking-tight text-[#262626]">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {quickAccessFolders.map((folder) => (
            <div
              key={folder.id}
              className="group relative flex h-[138px] cursor-pointer flex-col justify-between overflow-hidden rounded-[18px] bg-[#C2C5C8] shadow-xs transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_10px_20px_-4px_rgba(0,0,0,0.18)]"
            >
              <div className="absolute right-0 top-0 h-3.5 w-[52%] rounded-bl-[10px] bg-[#E5252A]" />
              <div className="p-3" />
              <div className="flex items-center justify-between rounded-b-[18px] bg-[#111111] px-4 py-3">
                <div>
                  <h4 className="text-[13px] font-bold leading-tight text-white">{folder.name}</h4>
                  <p className="mt-0.5 text-[10px] leading-tight text-[#888888]">{folder.description}</p>
                </div>
                <div className="flex items-center -space-x-1.5">
                  <div className="h-4 w-4 rounded-full border border-[#111] bg-white" />
                  <div className="h-4 w-4 rounded-full border border-[#111] bg-white" />
                  <div className="h-4 w-4 rounded-full border border-[#111] bg-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RECENT (live task data) */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[28px] font-black tracking-tight text-[#262626]">Recent</h2>
          {error && (
            <span className="text-xs text-red-700">Could not load tasks: {error.message}</span>
          )}
        </div>

        <div className="relative rounded-2xl bg-white pr-2">
          <div className="recent-scroll max-h-[290px] overflow-y-auto pr-4">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#F0F0F0] text-[13px] text-[#7E8288]">
                  <th className="w-[36%] pb-3.5 font-normal">Task</th>
                  <th className="w-[24%] pb-3.5 font-normal">Priority</th>
                  <th className="w-[24%] pb-3.5 font-normal">Due Date</th>
                  <th className="w-[16%] pb-3.5 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F7F7]">
                {rankedTasks.length > 0 ? (
                  rankedTasks.map((task) => (
                    <tr key={task.id} className="group transition-colors hover:bg-[#FAFAFA]">
                      <td className="py-3.5">
                        <Link
                          href={`/tasks/${task.id}/edit`}
                          className="flex items-center gap-3 no-underline"
                        >
                          <Icon
                            path={ICONS.file}
                            className="h-5 w-5 shrink-0 text-[#E5252A] transition-transform group-hover:scale-110"
                          />
                          <span className="text-[14px] font-medium text-[#222222]">
                            {task.title ?? "Untitled Task"}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PRIORITY_BADGE[task.priority.label]}`}
                        >
                          {task.priority.label}
                        </span>
                      </td>
                      <td className="py-3.5 text-[13px] text-[#555555]">
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "No due date"}
                      </td>
                      <td className="py-3.5 text-[13px] text-[#555555]">
                        {STATUS_LABEL[task.status] ?? task.status ?? "Pending"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-[#7E8288]">
                      No tasks found. Click &quot;+ New Task&quot; above to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Proposals view (unchanged logic) ---------- */
async function ProposalsContent({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const myRole = profile?.role ?? "Member";

  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (proposals ?? []) as Proposal[];
  let rows: ProposalRow[] = [];

  if (list.length > 0) {
    const { data: stages } = await supabase
      .from("approval_stages")
      .select("*")
      .in("proposal_id", list.map((p) => p.id));

    const { data: submitters } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", [...new Set(list.map((p) => p.submitted_by))]);

    rows = list.map((proposal) => {
      const proposalStages = (stages ?? []).filter(
        (s: ApprovalStage) => s.proposal_id === proposal.id
      );
      const active = routeStages(proposal, proposalStages).find((s) => s.isActive);
      const submitter = (submitters ?? []).find(
        (p: { id: string }) => p.id === proposal.submitted_by
      );

      return {
        proposal,
        submitterName: submitter?.full_name || submitter?.email || "Unknown",
        awaitingRole: active?.approver_role ?? null,
        isMyTurn: !!active && active.approver_role === myRole,
      };
    });

    rows.sort((a, b) => Number(b.isMyTurn) - Number(a.isMyTurn));
  }

  return (
    <div className="rounded-2xl bg-white p-6">
      <ProposalsPanel rows={rows} error={error?.message ?? null} />
    </div>
  );
}

/* ---------- Page ---------- */
function currentTime() {
  return Date.now();
}

export default async function DashboardPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const activeTab = tab === "proposals" ? "proposals" : "tasks";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#E8EAEF] p-6 text-[#333]">
        <div className="rounded-xl bg-white p-6 text-center shadow-md">
          <p className="text-lg font-semibold">Not logged in</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-sm text-white transition hover:opacity-90"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  // Active flagged announcements (table is optional until migration 003 is run).
  const { data: flagged } = await supabase
    .from("announcements")
    .select("*")
    .eq("enabled", true)
    .eq("is_draft", false);
  const nowMs = currentTime();
  const banners = sortAnnouncements((flagged ?? []) as Announcement[])
    .filter((a) => statusOf(a, nowMs) === "active" && visibleTo(a, profile?.role ?? "Member"))
    .slice(0, 2);

  const displayName: string = profile?.full_name || profile?.email || user.email || "";
  const initials =
    displayName
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s: string) => s[0]?.toUpperCase())
      .join("") || "ML";

  return (
    <div className="min-h-screen bg-[#E8EAEF] py-6">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col rounded-none bg-white px-6 pb-14 pt-8 shadow-[0_25px_60px_rgba(0,0,0,0.12)] lg:px-16">
        {/* TOP BAR: centered brand logo with cat mascot */}
        <header className="mb-6 flex w-full items-center justify-center">
          <Link href="/dashboard" className="relative flex select-none items-center no-underline">
            <span className="text-[44px] font-black leading-none tracking-tight text-[#111111]">Mimi</span>
            <span className="text-[44px] font-black leading-none tracking-tight text-[#E5252A]">Luxx</span>
            <div className="pointer-events-none absolute -top-4 right-0 translate-x-1.5">
              <svg className="h-8 w-8 text-[#111111]" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M5 16C5 10 8.5 6 14 6C19.5 6 23 10 23 16C23 21 19 25 14 25C9 25 5 21 5 16Z" fill="#111111" />
                <polygon points="5,8 10,13 4,14" fill="#E5252A" />
                <polygon points="23,8 18,13 24,14" fill="#E5252A" />
                <circle cx="11" cy="15" r="1.6" fill="#FFFFFF" />
                <circle cx="17" cy="15" r="1.6" fill="#FFFFFF" />
                <polygon points="14,17 12.8,18.8 15.2,18.8" fill="#E5252A" />
                <path d="M12 9.5L13 11.5L14 10.5L15 11.5L16 9.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
              </svg>
            </div>
          </Link>
        </header>

        {/* SEARCH & CONTROLS BAR */}
        <div className="mb-10 flex w-full flex-wrap items-center justify-between gap-4 lg:pl-[17rem] lg:pr-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-[44px] w-full max-w-[380px] items-center rounded-full border border-[#232323] bg-white px-5 sm:w-[380px]">
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-transparent pr-7 text-[14px] text-[#111111] placeholder-[#767676] outline-none"
              />
              <button
                type="button"
                title="Search"
                className="absolute right-4 text-[#232323] transition-colors hover:text-[#E5252A]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={activeTab === "proposals" ? "/dashboard" : "/dashboard?tab=proposals"}
              className={`rounded-full px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition active:scale-95 ${
                activeTab === "proposals" ? "bg-[#E5252A]" : "bg-[#181818] hover:bg-[#333333]"
              }`}
            >
              {activeTab === "proposals" ? "Tasks View" : "Proposals"}
            </Link>
            <Link
              href="/tasks/new"
              className="rounded-full bg-[#181818] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#333333] active:scale-95"
            >
              + New Task
            </Link>
          </div>
        </div>

        {/* MAIN GRID: floating sidebar + content */}
        <div className="flex w-full flex-col items-start gap-8 lg:flex-row lg:gap-12">
          <aside className="flex w-full shrink-0 flex-col items-center rounded-[44px] border border-[#EDEDED] bg-white px-4 py-9 shadow-[0_15px_45px_rgba(0,0,0,0.08)] lg:w-[215px]">
            <div className="mb-10 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#8F9499] shadow-inner">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>

            <nav className="flex w-full flex-col gap-3">
              {/* Home (active) */}
              <Link
                href="/dashboard"
                className="flex w-full items-center gap-4 rounded-2xl bg-[#E5252A]/[0.08] px-4 py-3 text-[15px] font-extrabold text-[#111111]"
              >
                <Icon path={ICONS.home} />
                <span>Home</span>
              </Link>

              <Link href="/orgs" className={navItemClass}>
                <Icon path={ICONS.org} />
                <span>Org Page</span>
              </Link>

              <Link href="/tasks" className={navItemClass}>
                <Icon path={ICONS.file} />
                <span>Task Page</span>
              </Link>

              <Link href="/approvals/overdue" className={navItemClass}>
                <Icon path={ICONS.check} />
                <span>Approvals</span>
              </Link>

              <Link href="/announcements" className={navItemClass}>
                <Icon path={ICONS.bell} />
                <span>Announcements</span>
              </Link>

              <Link href="/settings" className={navItemClass}>
                <Icon path={ICONS.settings} />
                <span>Settings</span>
              </Link>

              <Link href="/settings" className={navItemClass}>
                <Icon path={ICONS.account} />
                <span>Account</span>
              </Link>

              {profile?.role === "President" && (
                <Link href="/admin/users" className={navItemClass}>
                  <Icon path={ICONS.account} />
                  <span>Admin</span>
                </Link>
              )}

              <SidebarLogout>
                <Icon path={ICONS.logout} />
                <span>Logout</span>
              </SidebarLogout>
            </nav>
          </aside>

          <main className="w-full min-w-0 flex-1 lg:pr-4">
            {banners.length > 0 && (
              <div className="mb-6 flex flex-col gap-3" aria-label="Announcements">
                {banners.map((a) => (
                  <Link
                    key={a.id}
                    href="/announcements"
                    className={`block rounded-2xl border-l-8 bg-[#FAFAFA] px-4 py-3 no-underline transition hover:bg-neutral-100 ${
                      a.priority === "critical" ? "border-[#E5252A]" : a.priority === "high" ? "border-orange-500" : "border-neutral-400"
                    }`}
                  >
                    <p className="text-sm font-extrabold text-[#111]">{a.title}</p>
                    <p className="line-clamp-1 text-xs text-[#555]">{a.body}</p>
                  </Link>
                ))}
              </div>
            )}
            {activeTab === "proposals" ? (
              <ProposalsContent userId={user.id} />
            ) : (
              <TasksContent userId={user.id} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
