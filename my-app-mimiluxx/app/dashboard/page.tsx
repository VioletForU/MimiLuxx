import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTaskPriority } from "@/lib/priority";
import { routeStages } from "@/lib/stageRouting";
import type { Proposal, ApprovalStage } from "@/lib/types/proposal";
import DashboardList from "./DashboardList";
import DashboardTabs from "./DashboardTabs";
import ProposalsPanel, { type ProposalRow } from "./ProposalsPanel";

type Props = { searchParams: Promise<{ tab?: string }> };

async function TasksTab({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);

  const rankedTasks = (tasks ?? [])
    .map((task) => ({ ...task, priority: getTaskPriority(task.due_date) }))
    .sort((a, b) => b.priority.score - a.priority.score);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Next Actions</h1>
        <Link href="/tasks/new" className="rounded bg-black px-3 py-2 text-white">
          New Task
        </Link>
      </div>

      {error && <p>Could not load tasks: {error.message}</p>}

      <DashboardList initialTasks={rankedTasks} />
    </>
  );
}

async function ProposalsTab({ userId }: { userId: string }) {
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

    // Proposals waiting on you float to the top.
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
      <main className="mx-auto max-w-2xl p-6">
        <p>Not logged in</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <DashboardTabs active={activeTab} />
      {activeTab === "proposals" ? (
        <ProposalsTab userId={user.id} />
      ) : (
        <TasksTab userId={user.id} />
      )}
    </main>
  );
}
