import Link from "next/link";
import type { Proposal } from "@/lib/types/proposal";

export type ProposalRow = {
  proposal: Proposal;
  submitterName: string;
  awaitingRole: string | null;
  isMyTurn: boolean;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ProposalsPanel({
  rows,
  error,
}: {
  rows: ProposalRow[];
  error: string | null;
}) {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proposals</h1>
        <Link
          href="/proposals/new"
          className="rounded bg-black px-3 py-2 text-white"
        >
          New Proposal
        </Link>
      </div>

      {error && <p>Could not load proposals: {error}</p>}
      {!error && rows.length === 0 && (
        <p>No proposals yet. Submit the first one.</p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map(({ proposal, submitterName, awaitingRole, isMyTurn }) => (
          <li key={proposal.id}>
            <Link
              href={`/proposals/${proposal.id}`}
              className="block rounded border p-3 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{proposal.title}</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE[proposal.status]}`}
                >
                  {proposal.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                By {submitterName} ·{" "}
                {new Date(proposal.created_at).toLocaleDateString()}
              </p>
              {proposal.status === "pending" && awaitingRole && (
                <p className="mt-1 text-sm">
                  Awaiting {awaitingRole}
                  {isMyTurn && (
                    <span className="ml-2 rounded bg-black px-2 py-0.5 text-xs text-white">
                      Your turn
                    </span>
                  )}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
