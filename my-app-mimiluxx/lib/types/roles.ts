export type UserRole =
  | "Admin"
  | "President"
  | "Adviser"
  | "Vice President"
  | "Secretary"
  | "Committee Head"
  | "Member";

export const ROLES: UserRole[] = [
  "Admin",
  "President",
  "Adviser",
  "Vice President",
  "Secretary",
  "Committee Head",
  "Member",
];

// "Adviser" is stored in the database as "Adviser"; this is how it is shown.
export const ROLE_LABELS: Record<UserRole, string> = {
  Admin: "Admin",
  President: "President",
  Adviser: "Adviser / Teacher Coordinator",
  "Vice President": "Vice President",
  Secretary: "Secretary",
  "Committee Head": "Committee Head",
  Member: "Member",
};

/**
 * Can open the admin panel, change roles and delete data.
 * "Admin" is a system role: it has full admin access but is not a signatory
 * in the proposal approval chain (see APPROVAL_CHAIN).
 */
export const ADMIN_ROLES: UserRole[] = ["Admin", "President", "Adviser"];

/**
 * Can open the /admin panel (view users, change roles, delete data).
 * Narrower than ADMIN_ROLES on purpose: President and Adviser keep their other
 * powers (announcements, overdue limits, flags) but cannot use the panel.
 */
export const PANEL_ROLES: UserRole[] = ["Admin"];

/**
 * Organization-wide leadership: can open every committee and every member's
 * personal folder. A Committee Head has the same power, but only inside their
 * own committee. Keep in sync with is_org_leadership() in 010_member_files.sql.
 */
export const ORG_LEADERSHIP_ROLES: UserRole[] = ["President", "Adviser", "Vice President", "Secretary"];

/**
 * Roles a President can give people inside their own organization.
 * "President" is deliberately missing: only an Admin appoints presidents.
 */
export const ORG_ASSIGNABLE_ROLES: UserRole[] = [
  "Adviser",
  "Vice President",
  "Secretary",
  "Committee Head",
  "Member",
];

/** Can create organizations. */
export const ORG_CREATOR_ROLES: UserRole[] = ["Admin", "President", "Adviser"];

// These two numbers are enforced by the database (admin-panel-setup.sql).
// They are repeated here only so the screen can show them.
export const MAX_ORGANIZATIONS_PER_CREATOR = 2;
export const MAX_COMMITTEES_PER_ORGANIZATION = 10;

/** Who signs off each stage of a proposal, in order (the full, default chain). */
export const APPROVAL_CHAIN: { stage_order: number; approver_role: UserRole }[] = [
  { stage_order: 1, approver_role: "Committee Head" },
  { stage_order: 2, approver_role: "President" },
];

/**
 * Which roles must sign off, in order, for a proposal submitted by each role.
 * A submitter never reviews their own proposal, and stages for roles at or
 * below the submitter are skipped. Edit this map to change the routing.
 *
 *   Member          -> Committee Head -> President
 *   Committee Head  -> President
 *   VP / Secretary  -> President
 *   President       -> Adviser
 *   Adviser / Admin -> President
 */
const APPROVERS_BY_SUBMITTER: Record<UserRole, UserRole[]> = {
  Member: ["Committee Head", "President"],
  "Committee Head": ["President"],
  Secretary: ["President"],
  "Vice President": ["President"],
  President: ["Adviser"],
  Adviser: ["President"],
  Admin: ["President"],
};

/** Approval stages (numbered from 1) for a proposal submitted by `submitterRole`. */
export function getApprovalChain(
  submitterRole: string | null | undefined
): { stage_order: number; approver_role: UserRole }[] {
  const roles =
    APPROVERS_BY_SUBMITTER[submitterRole as UserRole] ?? APPROVERS_BY_SUBMITTER.Member;
  return roles.map((approver_role, i) => ({ stage_order: i + 1, approver_role }));
}

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as string[]).includes(role);
}

export function isPanelAdmin(role: string | null | undefined): boolean {
  return !!role && (PANEL_ROLES as string[]).includes(role);
}
