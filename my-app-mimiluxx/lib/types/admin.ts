import type { UserRole } from "@/lib/types/roles";
import type { ProposalStatus } from "@/lib/types/proposal";

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
};

export type AdminCommittee = {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
};

export type AdminOrg = {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  owner_name: string;
  created_at: string;
  committees: AdminCommittee[];
};

export type AdminProposal = {
  id: string;
  title: string;
  status: ProposalStatus;
  current_stage: number;
  submitter_name: string;
  created_at: string;
};

export type AdminTask = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  owner_name: string;
  created_at: string;
};

export type AdminOverview = {
  users_total: number;
  new_users_7d: number;
  new_users_30d: number;
  active_users_7d: number;
  users_by_role: Record<string, number>;
  organizations: number;
  committees: number;
  proposals: Record<string, number>;
  tasks: Record<string, number>;
};

export type TableStat = { name: string; rows: number; size: string };

export type DatabaseHealth = {
  db_size: string;
  active_connections: number;
  max_connections: number;
  tables: TableStat[];
};

export type ActivityItem = {
  occurred_at: string;
  kind: string;
  actor: string | null;
  detail: string | null;
};

export type LoadErrors = {
  users: string | null;
  overview: string | null;
  content: string | null;
  activity: string | null;
  health: string | null;
};

// Server actions return this instead of throwing, because Next.js hides the
// message of a thrown error from the browser in production builds.
export type ActionResult = { ok: true } | { ok: false; error: string };

export type DeletableKind = "organization" | "committee" | "proposal" | "task";
