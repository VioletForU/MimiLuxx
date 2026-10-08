import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTaskPriority } from "@/lib/priority";
import { routeStages } from "@/lib/stageRouting";
import type { Proposal, ApprovalStage } from "@/lib/types/proposal";
import DashboardList from "./DashboardList";
import ProposalsPanel, { type ProposalRow } from "./ProposalsPanel";

type Props = { searchParams: Promise<{ tab?: string }> };

async function TasksContent({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);

  const rankedTasks = (tasks ?? [])
    .map((task) => ({ ...task, priority: getTaskPriority(task.due_date) }))
    .sort((a, b) => b.priority.score - a.priority.score);

  // Mock folder cards matching the 8 quick access slots
  const quickAccessFolders = Array.from({ length: 8 }, (_, idx) => ({
    id: idx + 1,
    name: "Org Name",
    description: "Description",
  }));

  return (
    <div className="flex flex-col gap-7">
      {/* Quick Access Section */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-[#3b3b3b]">Quick Access</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {quickAccessFolders.map((folder) => (
            <div
              key={folder.id}
              className="group relative flex h-28 cursor-pointer flex-col transition hover:-translate-y-0.5"
            >
              <div className="relative flex-1 rounded-t-xl bg-[#939393] before:absolute before:-top-2 before:left-0 before:h-2.5 before:w-5/12 before:rounded-t-lg before:bg-[#939393]" />
              <div className="z-10 flex h-10 items-center justify-between rounded-b-xl bg-[#575757] px-3">
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold text-white">{folder.name}</span>
                  <span className="text-[9px] text-[#b5b5b5]">{folder.description}</span>
                </div>
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#242424]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#242424]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#242424]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Section (Dynamic Tasks Data) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#3b3b3b]">Recent Tasks</h2>
          {error && (
            <span className="text-xs text-red-700">
              Could not load tasks: {error.message}
            </span>
          )}
        </div>

        <div className="relative overflow-x-auto rounded-lg bg-neutral-200/50 p-4 pr-7">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-neutral-600">
                <th className="pb-2 font-medium">Task / Title</th>
                <th className="pb-2 font-medium">Priority Score</th>
                <th className="pb-2 font-medium">Due Date</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-300/60">
              {rankedTasks.length > 0 ? (
                rankedTasks.map((task) => (
                  <tr key={task.id} className="transition hover:bg-black/5">
                    <td className="py-2.5 font-medium text-neutral-800">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-4 w-3 rounded-[2px] bg-[#4b4b4b] [clip-path:polygon(0_0,65%_0,100%_35%,100%_100%,0_100%)]" />
                        {task.title ?? "Untitled Task"}
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center rounded-full bg-neutral-800 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {task.priority?.score ?? "N/A"}
                      </span>
                    </td>
                    <td className="py-2.5 text-neutral-600">
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No due date"}
                    </td>
                    <td className="py-2.5 text-neutral-600">
                      {task.status ?? "Pending"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-neutral-500">
                    No tasks found. Click &quot;+ New Task&quot; above to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="absolute right-2 top-4 bottom-4 w-1.5 rounded-full bg-[#b8b8b8]">
            <div className="h-1/3 w-full rounded-full bg-[#474747]" />
          </div>
        </div>

        <div className="mt-4">
          <DashboardList initialTasks={rankedTasks} />
        </div>
      </section>
    </div>
  );
}

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

  return <ProposalsPanel rows={rows} error={error?.message ?? null} />;
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
      <main className="flex min-h-screen items-center justify-center bg-[#d4d4d4] p-6 text-[#333]">
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

  return (
    <div className="min-h-screen bg-[#d4d4d4] p-6 text-[#333333] lg:px-9">
      {/* Top Navigation Bar */}
      <header className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-1.5 no-underline">
            <svg className="h-8 w-8" viewBox="0 0 28 28" fill="none">
              <path
                d="M4 18V8L9 13L14 8L19 13L24 8V18C24 21 21 24 17 24H11C7 24 4 21 4 18Z"
                fill="#EA2323"
              />
              <circle cx="9" cy="15" r="1.5" fill="#FFFFFF" />
              <circle cx="19" cy="15" r="1.5" fill="#FFFFFF" />
            </svg>
            <span className="text-xl font-extrabold tracking-tight text-neutral-900">
              Mimi<span className="text-[#EA2323]">Luxx</span>
            </span>
          </Link>

          {/* Search Pill */}
          <div className="hidden h-9 w-64 items-center rounded-full bg-[#9a9a9a] px-4 sm:flex md:w-72">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-transparent text-sm text-neutral-800 placeholder-[#555] outline-none"
            />
          </div>

          {/* Action Dots */}
          <div className="flex items-center gap-3">
            <button className="h-8 w-8 rounded-full bg-[#1f1f1f] transition hover:scale-105 hover:opacity-85" />
            <button className="h-8 w-8 rounded-full bg-[#1f1f1f] transition hover:scale-105 hover:opacity-85" />
            <button className="h-8 w-8 rounded-full bg-[#1f1f1f] transition hover:scale-105 hover:opacity-85" />
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href={activeTab === "proposals" ? "/dashboard" : "/dashboard?tab=proposals"}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === "proposals"
                ? "bg-[#EA2323] text-white"
                : "bg-[#1f1f1f] text-white hover:opacity-90"
            }`}
          >
            {activeTab === "proposals" ? "Tasks View" : "Proposals"}
          </Link>
          <Link
            href="/tasks/new"
            className="rounded-full bg-[#1f1f1f] px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            + New Task
          </Link>
          <button className="h-8 w-8 rounded-full bg-[#1f1f1f] transition hover:scale-105 hover:opacity-85" />
          <button className="h-8 w-8 rounded-full bg-[#1f1f1f] transition hover:scale-105 hover:opacity-85" />
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[140px_1fr]">
        {/* Floating Sidebar Dock */}
        <aside className="flex flex-row items-center justify-around rounded-3xl bg-[#525252] p-3 shadow-md lg:flex-col lg:gap-3.5 lg:rounded-[42px] lg:px-4 lg:py-6">
          <div className="h-11 w-11 rounded-full bg-[#8c8c8c] lg:mb-3" />
          <nav className="flex w-full flex-row justify-around gap-2 lg:flex-col lg:gap-3">
            <button className="h-10 w-10 rounded-xl bg-white transition hover:bg-neutral-100 lg:h-12 lg:w-full" />
            <button className="h-10 w-10 rounded-xl bg-[#cfcfcf] transition hover:bg-[#e5e5e5] lg:h-12 lg:w-full" />
            <button className="h-10 w-10 rounded-xl bg-[#cfcfcf] transition hover:bg-[#e5e5e5] lg:h-12 lg:w-full" />
            <button className="h-10 w-10 rounded-xl bg-[#cfcfcf] transition hover:bg-[#e5e5e5] lg:h-12 lg:w-full" />
            <button className="h-10 w-10 rounded-xl bg-[#cfcfcf] transition hover:bg-[#e5e5e5] lg:h-12 lg:w-full" />
          </nav>
        </aside>

        {/* Center Content Area */}
        <main>
          {activeTab === "proposals" ? (
            <ProposalsContent userId={user.id} />
          ) : (
            <TasksContent userId={user.id} />
          )}
        </main>
      </div>
    </div>
  );
}
