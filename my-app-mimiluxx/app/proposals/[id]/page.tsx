import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApprovalTracker from "./ApprovalTracker";

type Params = { params: Promise<{ id: string }> };

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
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
      </main>
    );
  }

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (!proposal) {
    notFound();
  }

  const { data: stages } = await supabase
    .from("approval_stages")
    .select("*")
    .eq("proposal_id", id)
    .order("stage_order", { ascending: true });

  const { data: submitter } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", proposal.submitted_by)
    .single();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/dashboard?tab=proposals" className="text-sm underline">
        ← Back to proposals
      </Link>

      <div className="mt-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{proposal.title}</h1>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE[proposal.status]}`}
        >
          {proposal.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Submitted by {submitter?.full_name || submitter?.email || "Unknown"} on{" "}
        {new Date(proposal.created_at).toLocaleDateString()}
      </p>
      {proposal.description && (
        <p className="mt-4 whitespace-pre-wrap">{proposal.description}</p>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold">Approval Progress</h2>
      <ApprovalTracker
        proposal={proposal}
        stages={stages ?? []}
        userRole={me?.role ?? "Member"}
      />
    </main>
  );
}
