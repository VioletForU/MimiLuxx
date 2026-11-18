import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_FILE_BYTES, formatBytes, mimeTypeFor, safeFileName, validateFile } from "@/lib/attachments";

export const MEMBER_FILES_BUCKET = "member-files";
export { MAX_FILE_BYTES, formatBytes, validateFile };

export type MemberFile = {
  id: string;
  organization_id: string;
  owner_id: string;
  uploaded_by: string | null;
  path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
};

function friendlyError(message: string): string {
  if (/member_files|member-files|Bucket not found|schema cache/i.test(message)) {
    return "Personal folders aren't set up yet. Run supabase/migrations/010_member_files.sql.";
  }
  if (/row-level security|violates/i.test(message)) {
    return "You don't have access to this folder.";
  }
  return message;
}

/** Upload to storage, then record it. If recording fails the uploaded file is removed again. */
export async function uploadMemberFile(
  supabase: SupabaseClient,
  { organizationId, ownerId, uploadedBy, file }: { organizationId: string; ownerId: string; uploadedBy: string; file: File }
): Promise<MemberFile> {
  const problem = validateFile(file);
  if (problem) throw new Error(`${file.name}: ${problem}`);

  const mime = mimeTypeFor(file.name)!;
  const path = `${organizationId}/${ownerId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

  const up = await supabase.storage.from(MEMBER_FILES_BUCKET).upload(path, file, { contentType: mime });
  if (up.error) throw new Error(friendlyError(up.error.message));

  const { data, error } = await supabase
    .from("member_files")
    .insert({
      organization_id: organizationId,
      owner_id: ownerId,
      uploaded_by: uploadedBy,
      path,
      file_name: file.name,
      mime_type: mime,
      size_bytes: file.size,
    })
    .select()
    .single();
  if (error || !data) {
    await supabase.storage.from(MEMBER_FILES_BUCKET).remove([path]);
    throw new Error(friendlyError(error?.message ?? "Could not save the file."));
  }
  return data as MemberFile;
}

/** Row first, file second: a failure in between leaves an invisible orphan file, never a dead link. */
export async function removeMemberFile(supabase: SupabaseClient, f: MemberFile): Promise<void> {
  const { error } = await supabase.from("member_files").delete().eq("id", f.id);
  if (error) throw new Error(friendlyError(error.message));
  await supabase.storage.from(MEMBER_FILES_BUCKET).remove([f.path]);
}

/** Opens the file through a 60-second signed URL (private bucket, nothing permanent is stored). */
export async function openMemberFile(supabase: SupabaseClient, f: MemberFile): Promise<void> {
  // Open the tab inside the click so pop-up blockers allow it, then point it at the URL.
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;

  const { data, error } = await supabase.storage.from(MEMBER_FILES_BUCKET).createSignedUrl(f.path, 60);
  if (error || !data) {
    tab?.close();
    throw new Error("Could not open this file. Please try again.");
  }
  if (tab) {
    tab.location.href = data.signedUrl;
    return;
  }
  const dl = await supabase.storage.from(MEMBER_FILES_BUCKET).createSignedUrl(f.path, 60, { download: f.file_name });
  if (dl.error || !dl.data) throw new Error("Could not open this file. Please try again.");
  const link = document.createElement("a");
  link.href = dl.data.signedUrl;
  link.download = f.file_name;
  document.body.append(link);
  link.click();
  link.remove();
}
