export type UserRole =
  | "President"
  | "Adviser"
  | "Vice President"
  | "Secretary"
  | "Committee Head"
  | "Member";

export const ROLES: UserRole[] = [
  "President",
  "Adviser",
  "Vice President",
  "Secretary",
  "Committee Head",
  "Member",
];

// "Adviser" is stored in the database as "Adviser"; this is how it is shown.
export const ROLE_LABELS: Record<UserRole, string> = {
  President: "President",
  Adviser: "Adviser / Teacher Coordinator",
  "Vice President": "Vice President",
  Secretary: "Secretary",
  "Committee Head": "Committee Head",
  Member: "Member",
};

/** Can open the admin panel, change roles and delete data. */
export const ADMIN_ROLES: UserRole[] = ["President", "Adviser"];

/** Can create organizations. */
export const ORG_CREATOR_ROLES: UserRole[] = ["President", "Adviser"];

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
