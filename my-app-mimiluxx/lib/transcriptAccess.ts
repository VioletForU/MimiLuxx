import type { OrgAccess } from "@/lib/orgAccess";

/** Org roles allowed to submit transcripts (Admin is allowed too). */
export const TRANSCRIPT_ROLES = ["President", "Committee Head"];
export const ALLOWED_TRANSCRIPT_EXTENSIONS = [".txt", ".md"];
export const MAX_TRANSCRIPT_BYTES = 200 * 1024; // 200 KB
export const MIN_TRANSCRIPT_CHARS = 20;

export function canSubmitTranscript(a: Pick<OrgAccess, "isAdmin" | "role">): boolean {
  return a.isAdmin || (!!a.role && TRANSCRIPT_ROLES.includes(a.role));
}

export function hasAllowedExtension(fileName: string): boolean {
  const name = fileName.toLowerCase();
  return ALLOWED_TRANSCRIPT_EXTENSIONS.some((ext) => name.endsWith(ext));
}