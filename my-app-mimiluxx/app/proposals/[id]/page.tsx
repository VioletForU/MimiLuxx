import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApprovalTracker from "./ApprovalTracker";

type Params = { params: Promise<{ id: string }> };

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default async function ProposalDetailPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Not logged in</p>
        <Link href="/login" className="underline">Go to login</Link>
      </main>
    );
  }

  const { data: proposal } = await supabase.from("proposals").select("*").eq("id", id).single();
  if (!proposal) notFound();

  const { data: stages } = await supabase
    .from("approval_stages")
    .select("*")
    .eq("proposal_id", id)
    .order("stage_order", { ascending: true });

  const approverIds = [...new Set((stages ?? []).map((s) => s.approved_by).filter(Boolean))] as string[];
  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("id", [proposal.submitted_by, user.id, ...approverIds]);

  const nameOf = (pid: string | null) => {
    const p = (people ?? []).find((x) => x.id === pid);
    return p?.full_name || p?.email || "Unknown";
  };
  const me = (people ?? []).find((x) => x.id === user.id);
  const submitter = (people ?? []).find((x) => x.id === proposal.submitted_by);

  const approverNames: Record<string, string> = {};
  approverIds.forEach((pid) => (approverNames[pid] = nameOf(pid)));

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="text-lg font-extrabold">
            Mimi<span className="text-brand">Luxx</span>
          </Link>
          <nav aria-label="Main" className="hidden gap-6 text-sm font-bold sm:flex">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/tasks">All Tasks</Link>
            <Link href="/dashboard?tab=proposals" className="text-brand">Proposals</Link>
            <Link href="/approvals/overdue">Approvals</Link>
            <Link href="/settings">Settings</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-bold text-ink/60">
            <Link href="/dashboard?tab=proposals" className="hover:underline">Proposals</Link> › {proposal.title}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Sign-off request</h1>
        </div>

        <ApprovalTracker
          proposal={proposal}
          stages={stages ?? []}
          userRole={me?.role ?? "Member"}
          submitterName={submitter?.full_name || submitter?.email || "Unknown"}
          submitterRole={submitter?.role ?? "Member"}
          approverNames={approverNames}
          statusBadgeClass={STATUS_BADGE[proposal.status]}
        />
      </main>
    </div>
  );
}
