import type { SupabaseClient } from "@supabase/supabase-js";

export const ATTACHMENT_BUCKET = "task-files";
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // keep in sync with 006_task_attachments.sql
export const MAX_FILES_PER_TASK = 10;

export type TaskAttachment = {
  id: string;
  task_id: string;
  user_id: string;
  path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
};

/** Allowed extensions → the MIME type we upload with. Browsers report these inconsistently
 *  (e.g. .csv as application/vnd.ms-excel on Windows), so we go by extension. */
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export const ACCEPT = Object.keys(TYPES).map((e) => `.${e}`).join(",");
export const LIMITS_HINT = `Images, PDF, Word, Excel, PowerPoint, CSV or text · up to ${MAX_FILE_BYTES / 1024 / 1024} MB each · ${MAX_FILES_PER_TASK} files per task`;

const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function isImage(a: Pick<TaskAttachment, "mime_type">): boolean {
  return !!a.mime_type?.startsWith("image/");
}

/** Returns a message if the file can't be attached, otherwise null. */
export function validateFile(file: File): string | null {
  if (!TYPES[extOf(file.name)]) return "this file type isn't supported.";
  if (file.size === 0) return "the file is empty.";
  if (file.size > MAX_FILE_BYTES) return `too large (${formatBytes(file.size)}). The limit is ${formatBytes(MAX_FILE_BYTES)}.`;
  return null;
}

const safeName = (name: string) => name.replace(/[^\w.\-]+/g, "_").replace(/^_+|_+$/g, "").slice(-100) || "file";

export function friendlyStorageError(message: string): string {
  if (/task_attachments|task-files|Bucket not found|schema cache/i.test(message)) {
    return "Attachments aren't set up yet. Run supabase/migrations/006_task_attachments.sql.";
  }
  return message;
}

/** Upload to storage, then record it. If recording fails the uploaded file is removed again. */
export async function uploadAttachment(
  supabase: SupabaseClient,
  { taskId, userId, file }: { taskId: string; userId: string; file: File }
): Promise<TaskAttachment> {
  const problem = validateFile(file);
  if (problem) throw new Error(`${file.name}: ${problem}`);

  const mime = TYPES[extOf(file.name)];
  const path = `${userId}/${taskId}/${crypto.randomUUID()}-${safeName(file.name)}`;

  const up = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, { contentType: mime });
  if (up.error) throw new Error(friendlyStorageError(up.error.message));

  const { data, error } = await supabase
    .from("task_attachments")
    .insert({ task_id: taskId, user_id: userId, path, file_name: file.name, mime_type: mime, size_bytes: file.size })
    .select()
    .single();
  if (error || !data) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
    throw new Error(friendlyStorageError(error?.message ?? "Could not save the attachment."));
  }
  return data as TaskAttachment;
}

/** Row first, file second: a failure in between leaves an invisible orphan file, never a dead link in the UI. */
export async function removeAttachment(supabase: SupabaseClient, a: TaskAttachment): Promise<void> {
  const { error } = await supabase.from("task_attachments").delete().eq("id", a.id);
  if (error) throw new Error(friendlyStorageError(error.message));
  await supabase.storage.from(ATTACHMENT_BUCKET).remove([a.path]);
}

/** Opens the file through a 60-second signed URL (private bucket, nothing permanent is stored). */
export async function openAttachment(supabase: SupabaseClient, a: TaskAttachment): Promise<void> {
  // Open the tab right away (inside the click) so pop-up blockers allow it, then point it at the URL.
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;

  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(a.path, 60);
  if (error || !data) {
    tab?.close();
    throw new Error("Could not open this file. Please try again.");
  }
  if (tab) {
    tab.location.href = data.signedUrl;
    return;
  }
  // Pop-up blocked: fall back to a download in this tab.
  const dl = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(a.path, 60, { download: a.file_name });
  if (dl.error || !dl.data) throw new Error("Could not open this file. Please try again.");
  const link = document.createElement("a");
  link.href = dl.data.signedUrl;
  link.download = a.file_name;
  document.body.append(link);
  link.click();
  link.remove();
}
