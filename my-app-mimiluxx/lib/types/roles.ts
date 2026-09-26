export type UserRole = "Member" | "Committee Lead" | "Exec Approver";

export const ROLES: UserRole[] = ["Member", "Committee Lead", "Exec Approver"];

export const ROLE_LABELS: Record<UserRole, string> = {
  "Member": "Member",
  "Committee Lead": "Committee Lead",
  "Exec Approver": "Exec Approver",
};
