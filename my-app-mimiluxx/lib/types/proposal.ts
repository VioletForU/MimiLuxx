export type ProposalStatus = "pending" | "approved" | "rejected";

export type ApprovalStage = {
  id: string;
  proposal_id: string;
  stage_order: number;
  approver_role: "Committee Lead" | "Exec Approver";
  status: ProposalStatus;
  approved_by: string | null;
  approved_at: string | null;
};

export type Proposal = {
  id: string;
  title: string;
  description: string | null;
  submitted_by: string;
  status: ProposalStatus;
  current_stage: number;
  created_at: string;
  updated_at: string;
};
