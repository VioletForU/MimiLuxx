import type { ApprovalStage, Proposal } from "@/lib/types/proposal";

export type StageWithRouting = ApprovalStage & {
  isActive: boolean;
  isLocked: boolean;
  startedAt: string | null;
};

/**
 * Computes routing info for a proposal's approval chain:
 * - which stage is currently active (the first pending one, in order)
 * - which stages are locked (waiting on earlier stages)
 * - when each stage actually started waiting (for time-elapsed display
 *   and, later, overdue detection in US-09)
 */
export function routeStages(
  proposal: Proposal,
  stages: ApprovalStage[]
): StageWithRouting[] {
  const sorted = [...stages].sort((a, b) => a.stage_order - b.stage_order);

  // Only a still-pending proposal has an active stage. Once it's rejected
  // or fully approved, nothing should be actionable anymore.
  const activeIndex =
    proposal.status === "pending"
      ? sorted.findIndex((s) => s.status === "pending")
      : -1;

  return sorted.map((stage, index) => ({
    ...stage,
    isActive: index === activeIndex,
    isLocked: activeIndex !== -1 && index > activeIndex,
    startedAt:
      index === 0 ? proposal.created_at : sorted[index - 1]?.approved_at ?? null,
  }));
}

/** Returns the role that currently needs to act on this proposal, or null if fully resolved. */
export function getActiveApproverRole(
  proposal: Proposal,
  stages: ApprovalStage[]
): ApprovalStage["approver_role"] | null {
  const routed = routeStages(proposal, stages);
  const active = routed.find((s) => s.isActive);
  return active?.approver_role ?? null;
}
