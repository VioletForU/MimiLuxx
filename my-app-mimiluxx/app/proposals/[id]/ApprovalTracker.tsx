"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Proposal, ApprovalStage } from "@/lib/types/proposal";
import { routeStages } from "@/lib/stageRouting";

function formatElapsed(fromISO: string): string {
  const ms = Date.now() - new Date(fromISO).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return "just now";
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-700 border-green-300",
  rejected: "bg-red-100 text-red-700 border-red-300",
  pending: "bg-gray-100 text-gray-600 border-gray-300",
};

export default function ApprovalTracker({
  proposal,
  stages,
  userRole,
}: {
  proposal: Proposal;
  stages: ApprovalStage[];
  userRole: string;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const routedStages = routeStages(proposal, stages);

  async function handleAction(stageId: string, action: "approve" | "reject") {
    setError(null);
    setLoadingAction(stageId + action);

    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, action }),
    });

    setLoadingAction(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not update stage");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-3 text-red-600">{error}</p>}
      <ol className="flex flex-col gap-3">
        {routedStages.map((stage) => {
          const canAct = stage.isActive && userRole === stage.approver_role;

          return (
            <li
              key={stage.id}
              className={`rounded border p-3 ${STATUS_STYLES[stage.status]} ${
                stage.isActive ? "ring-2 ring-black" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  Stage {stage.stage_order}: {stage.approver_role}
                </span>
                <span className="text-xs font-medium uppercase">{stage.status}</span>
              </div>

              <p className="mt-1 text-sm" suppressHydrationWarning>
                {stage.status === "approved" && stage.approved_at && (
                  <>Approved {formatElapsed(stage.approved_at)} ago</>
                )}
                {stage.status === "rejected" && stage.approved_at && (
                  <>Rejected {formatElapsed(stage.approved_at)} ago</>
                )}
                {stage.status === "pending" && stage.isActive && stage.startedAt && (
                  <>
                    Pending for {formatElapsed(stage.startedAt)}, awaiting{" "}
                    {stage.approver_role}
                  </>
                )}
                {stage.status === "pending" && stage.isLocked && (
                  <>Waiting on earlier stage(s) to complete</>
                )}
                {stage.status === "pending" &&
                  !stage.isActive &&
                  !stage.isLocked &&
                  proposal.status === "rejected" && (
                    <>Not reached because the proposal was rejected</>
                  )}
              </p>

              {canAct && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAction(stage.id, "approve")}
                    disabled={loadingAction !== null}
                    className="rounded bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    {loadingAction === stage.id + "approve" ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleAction(stage.id, "reject")}
                    disabled={loadingAction !== null}
                    className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    {loadingAction === stage.id + "reject" ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
