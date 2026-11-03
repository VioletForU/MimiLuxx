"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Proposal, ApprovalStage } from "@/lib/types/proposal";
import { routeStages } from "@/lib/stageRouting";

type Stage = ApprovalStage & { rejection_reason?: string | null };

function fmt(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const NODE: Record<string, string> = {
  done: "bg-green-600 text-white border-green-600",
  rejected: "bg-red-600 text-white border-red-600",
  active: "bg-brand text-white border-brand ring-4 ring-brand/20",
  upcoming: "bg-white text-ink/50 border-ink/25",
};

export default function ApprovalTracker({
  proposal,
  stages,
  userRole,
  submitterName,
  submitterRole,
  approverNames,
  statusBadgeClass,
}: {
  proposal: Proposal;
  stages: Stage[];
  userRole: string;
  submitterName: string;
  submitterRole: string;
  approverNames: Record<string, string>;
  statusBadgeClass: string;
}) {
  const router = useRouter();
  const routed = routeStages(proposal, stages) as (ReturnType<typeof routeStages>[number] & { rejection_reason?: string | null })[];
  const active = routed.find((s) => s.isActive) ?? null;
  const isSignatory = !!active && active.approver_role === userRole;
  const decided = proposal.status !== "pending";

  const [drawer, setDrawer] = useState(false);
  const [reason, setReason] = useState("");
  const [tip, setTip] = useState<"approve" | "reject" | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    if (!active) return;
    setError(null);
    setBusy(action);
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: active.id, action, reason: action === "reject" ? reason.trim() : undefined }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update this request.");
      return;
    }
    setDrawer(false);
    setReason("");
    router.refresh();
  }

  const reasonOk = reason.trim().length >= 10;
  const rejectedStage = routed.find((s) => s.status === "rejected");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      {/* REQUEST CARD */}
      <section className="min-w-0 rounded-2xl border border-ink/15 bg-white p-6 shadow-sm" aria-labelledby="req-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="req-title" className="text-xl font-extrabold">{proposal.title}</h2>
            <p className="mt-1 text-sm text-ink/60">
              Requested by <strong className="text-ink">{submitterName}</strong> · {submitterRole}
            </p>
            <p className="text-sm text-ink/60" suppressHydrationWarning>Submitted {fmt(proposal.created_at)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusBadgeClass}`}>{proposal.status}</span>
        </div>

        {proposal.description && <p className="mt-5 whitespace-pre-wrap text-sm text-ink/80">{proposal.description}</p>}

        <hr className="my-6 border-ink/10" />

        {/* Guard banner */}
        <div
          className={`flex items-start gap-3 rounded-xl border p-3 text-sm font-semibold ${
            isSignatory ? "border-green-300 bg-green-50 text-green-900" : "border-ink/15 bg-neutral-50 text-ink/70"
          }`}
        >
          <span aria-hidden="true">{isSignatory ? "🛡️" : "🔒"}</span>
          <p>
            {decided
              ? `This request is ${proposal.status}.`
              : isSignatory
                ? `You are the assigned signatory (${active!.approver_role}). Review the request, then approve or reject it.`
                : active
                  ? `Waiting on the ${active.approver_role}. You are signed in as ${userRole}, so you can view this request but not decide it.`
                  : "No stage is waiting for a decision."}
          </p>
        </div>

        {error && <p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}

        {!decided && (
          <div className="mt-5">
            <p className="mb-3 text-sm font-bold">Your decision</p>
            <div className="flex flex-wrap items-center gap-3">
              {(["approve", "reject"] as const).map((kind) => {
                const locked = !isSignatory;
                return (
                  <span
                    key={kind}
                    className="relative"
                    onMouseEnter={() => locked && setTip(kind)}
                    onMouseLeave={() => setTip(null)}
                    onFocus={() => locked && setTip(kind)}
                    onBlur={() => setTip(null)}
                  >
                    <button
                      type="button"
                      aria-disabled={locked}
                      disabled={busy !== null}
                      onClick={() => {
                        if (locked) return;
                        if (kind === "approve") act("approve");
                        else setDrawer((d) => !d);
                      }}
                      className={`inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-extrabold text-white transition active:scale-95 disabled:opacity-60 ${
                        kind === "approve" ? "bg-green-600" : "bg-brand"
                      } ${locked ? "cursor-not-allowed opacity-40" : "hover:opacity-90"}`}
                    >
                      {locked && <span aria-hidden="true">🔒</span>}
                      {kind === "approve" ? (busy === "approve" ? "Approving…" : "Approve") : "Reject"}
                    </button>
                    {tip === kind && (
                      <span role="tooltip" className="absolute left-0 top-full z-10 mt-2 w-60 rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white shadow-lg">
                        Only assigned signatory can {kind} this request
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            {!isSignatory && <p className="mt-3 text-xs font-bold text-ink/60">Locked: only the assigned signatory can approve or reject.</p>}

            {drawer && isSignatory && (
              <form
                className="mt-4 rounded-xl border border-ink/15 bg-neutral-50 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (reasonOk) act("reject");
                }}
              >
                <label htmlFor="reason" className="mb-1 block text-sm font-bold">
                  Why are you rejecting this? <span className="text-brand">(required)</span>
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Tell ${submitterName} what needs to change so they can fix it and resubmit.`}
                  className="w-full rounded-lg border border-ink/25 bg-white p-3 text-sm outline-none focus:ring-4 focus:ring-brand/25"
                />
                <div className="mt-1 flex justify-between text-xs">
                  <p className={`font-bold ${reasonOk ? "text-ink/60" : "text-brand"}`}>At least 10 characters.</p>
                  <p className="text-ink/50">{reason.length}/300</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="submit" disabled={!reasonOk || busy !== null} className="h-10 rounded-full bg-brand px-5 text-sm font-extrabold text-white disabled:opacity-40">
                    {busy === "reject" ? "Rejecting…" : "Confirm rejection"}
                  </button>
                  <button type="button" onClick={() => setDrawer(false)} className="h-10 rounded-full border border-ink px-5 text-sm font-extrabold hover:bg-neutral-100">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {decided && (
          <div className="mt-5 rounded-xl border border-ink/15 p-4" aria-live="polite">
            <p className="text-base font-extrabold">
              {proposal.status === "approved" ? "Approved ✓" : "Rejected ✗"}
            </p>
            <p className="mt-1 text-sm text-ink/70">
              {proposal.status === "approved" ? "Every stage signed off on this request." : `Rejected at stage ${rejectedStage?.stage_order ?? "?"} (${rejectedStage?.approver_role ?? ""}).`}
            </p>
            {rejectedStage?.rejection_reason && (
              <blockquote className="mt-3 border-l-4 border-brand pl-3 text-sm italic text-ink/80">{rejectedStage.rejection_reason}</blockquote>
            )}
          </div>
        )}
      </section>

      {/* SIGN-OFF QUEUE */}
      <aside className="min-w-0 rounded-2xl border border-ink/15 bg-white p-6 shadow-sm lg:self-start" aria-labelledby="trail-title">
        <h2 id="trail-title" className="text-lg font-extrabold">Sign-off queue</h2>
        <p className="mt-1 text-sm text-ink/60">Each stage must finish before the next one starts.</p>
        <ol className="mt-5 grid gap-5">
          <li className="flex gap-3">
            <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold ${NODE.done}`}>1</span>
            <div>
              <p className="text-sm font-extrabold">Submitted</p>
              <p className="text-xs text-ink/60" suppressHydrationWarning>{submitterName} · {fmt(proposal.created_at)}</p>
            </div>
          </li>
          {routed.map((s, i) => {
            const state = s.status === "approved" ? "done" : s.status === "rejected" ? "rejected" : s.isActive ? "active" : "upcoming";
            return (
              <li key={s.id} className="flex gap-3">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold ${NODE[state]}`}>{i + 2}</span>
                <div>
                  <p className="text-sm font-extrabold">
                    {s.approver_role} {s.status === "approved" ? "approved" : s.status === "rejected" ? "rejected" : ""}
                  </p>
                  <p className="text-xs text-ink/60" suppressHydrationWarning>
                    {s.status !== "pending" && s.approved_by
                      ? `${approverNames[s.approved_by] ?? "Unknown"} · ${fmt(s.approved_at)}`
                      : s.isActive
                        ? "Waiting for decision"
                        : s.isLocked
                          ? "Waiting on earlier stage"
                          : "Not reached"}
                  </p>
                </div>
              </li>
            );
          })}
          <li className="flex gap-3">
            <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold ${decided ? NODE.done : NODE.upcoming}`}>{routed.length + 2}</span>
            <div>
              <p className="text-sm font-extrabold">Request closed</p>
              <p className="text-xs text-ink/60">{decided ? `Final decision: ${proposal.status}` : "After the final decision"}</p>
            </div>
          </li>
        </ol>
      </aside>
    </div>
  );
}
