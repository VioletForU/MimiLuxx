import { ORG_LEADERSHIP_ROLES } from "@/lib/types/roles";

/**
 * Who the signed-in person is inside one organization. These helpers decide what
 * the folder pages show; the database enforces the same rules (010_member_files.sql).
 */
export type OrgAccess = {
  userId: string;
  isAdmin: boolean;
  /** Their role in this organization, or null if they only have access as an Admin. */
  role: string | null;
  /** The committee they belong to in this organization, if any. */
  committeeId: string | null;
};

/** Admins and President / Adviser / Vice President / Secretary. */
export function isLeadership(a: OrgAccess): boolean {
  return a.isAdmin || (!!a.role && (ORG_LEADERSHIP_ROLES as string[]).includes(a.role));
}

/** Leadership can open every committee; everyone else only their own. */
export function canOpenCommittee(a: OrgAccess, committeeId: string): boolean {
  return isLeadership(a) || (a.committeeId !== null && a.committeeId === committeeId);
}

/** A Committee Head (for their own committee) or anyone in leadership. */
export function isCommitteeLead(a: OrgAccess, committeeId: string): boolean {
  return isLeadership(a) || (a.role === "Committee Head" && a.committeeId === committeeId);
}

/** Your own folder, or the folder of someone in a committee you lead. */
export function canOpenMemberFolder(a: OrgAccess, ownerId: string, ownerCommitteeId: string): boolean {
  return a.userId === ownerId || isCommitteeLead(a, ownerCommitteeId);
}
