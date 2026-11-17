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

/** Who signs off each stage of a proposal, in order. */
export const APPROVAL_CHAIN: { stage_order: number; approver_role: UserRole }[] = [
  { stage_order: 1, approver_role: "Committee Head" },
  { stage_order: 2, approver_role: "President" },
];

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as string[]).includes(role);
}

export function isPanelAdmin(role: string | null | undefined): boolean {
  return !!role && (PANEL_ROLES as string[]).includes(role);
}
