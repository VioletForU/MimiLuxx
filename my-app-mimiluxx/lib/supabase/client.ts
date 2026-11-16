const supabase = createClient(); // lib/supabase/client.ts

async function attach(taskId: string, userId: string, file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Max 10 MB");
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${taskId}/${crypto.randomUUID()}-${safe}`;

  const up = await supabase.storage.from("task-files").upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;

  const { error } = await supabase.from("task_attachments").insert({
    task_id: taskId, user_id: userId, path,
    file_name: file.name, mime_type: file.type, size_bytes: file.size,
  });
  if (error) {
    await supabase.storage.from("task-files").remove([path]); // don't leave an orphan
    throw error;
  }
}