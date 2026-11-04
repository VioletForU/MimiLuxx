import Link from "next/link";
import type { Proposal } from "@/lib/types/proposal";

export type ProposalRow = {
  proposal: Proposal;
  submitterName: string;
  awaitingRole: string | null;
  isMyTurn: boolean;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

const STATUS_BAR: Record<string, string> = {
  pending: "bg-amber-400",
  approved: "bg-emerald-500",
  rejected: "bg-[#E5252A]",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ProposalsPanel({
  rows,
  error,
  query = "",
}: {
  rows: ProposalRow[];
  error: string | null;
  query?: string;
}) {
  const waitingOnMe = rows.filter((r) => r.isMyTurn && r.proposal.status === "pending").length;

  return (
    <section aria-label="Proposals">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-black tracking-tight text-[#1A1A1D] sm:text-[24px]">Proposals</h2>
          <p className="mt-0.5 text-[13px] text-[#7A7F87]">
            {query
              ? `Showing results for “${query}”`
              : `${rows.length} ${rows.length === 1 ? "proposal" : "proposals"}`}
            {waitingOnMe > 0 && (
              <>
                {" · "}
                <span className="font-bold text-[#E5252A]">{waitingOnMe} waiting on you</span>
              </>
            )}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-800">
          Could not load proposals: {error}
        </p>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#D9DBE0] bg-[#FAFAFB] px-6 py-14 text-center">
          <p className="text-[14px] font-bold text-[#333]">
            {query ? `No proposals match “${query}”` : "No proposals yet"}
          </p>
          <p className="mt-1 text-[13px] text-[#7A7F87]">
            {query ? (
              <Link href="/dashboard?tab=proposals" className="font-bold text-[#E5252A] hover:underline">
                Clear search
              </Link>
            ) : (
              <>
                Be the first to{" "}
                <Link href="/proposals/new" className="font-bold text-[#E5252A] hover:underline">
                  submit a proposal
                </Link>
                .
              </>
            )}
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map(({ proposal, submitterName, awaitingRole, isMyTurn }) => (
          <li key={proposal.id}>
            <Link
              href={`/proposals/${proposal.id}`}
              className="group relative block overflow-hidden rounded-2xl border border-[#ECECEF] bg-white py-4 pl-6 pr-5 shadow-[0_1px_2px_rgba(16,16,20,0.04)] transition hover:-translate-y-0.5 hover:border-[#D9DBE0] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
            >
              <span
                className={`absolute inset-y-0 left-0 w-1.5 ${STATUS_BAR[proposal.status] ?? "bg-neutral-300"}`}
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[15px] font-extrabold text-[#1A1A1D]">{proposal.title}</p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
                    STATUS_BADGE[proposal.status] ?? "bg-neutral-100 text-neutral-600 ring-neutral-200"
                  }`}
                >
                  {STATUS_LABEL[proposal.status] ?? proposal.status}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[#7A7F87]">
                Submitted by {submitterName} · {formatDate(proposal.created_at)}
              </p>
              {proposal.status === "pending" && awaitingRole && (
                <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-[#3A3A3F]">
                  <span>
                    Awaiting <span className="font-bold">{awaitingRole}</span>
                  </span>
                  {isMyTurn && (
                    <span className="rounded-full bg-[#E5252A] px-2.5 py-0.5 text-[11px] font-bold text-white">
                      Your turn
                    </span>
                  )}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
