import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TaskBoard, { type BoardTask } from "./TaskBoard";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>Not logged in</p>
        <Link href="/login" className="underline">Go to login</Link>
      </main>
    );
  }

  const COLS = "id, title, description, status, due_date, created_at";
  // Ask for attachment counts too; if the attachments table doesn't exist yet (migration 006
  // not run), fall back to the plain query so the task list still works.
  const withCounts = await supabase
    .from("tasks")
    .select(`${COLS}, task_attachments(count)`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  let rows: BoardTask[];
  let loadError: string | null = null;
  if (!withCounts.error) {
    rows = (withCounts.data ?? []).map((r) => {
      const { task_attachments, ...task } = r as unknown as BoardTask & { task_attachments?: { count: number }[] };
      return { ...task, attachment_count: task_attachments?.[0]?.count ?? 0 };
    });
  } else {
    const plain = await supabase.from("tasks").select(COLS).eq("user_id", user.id).order("created_at", { ascending: false });
    rows = (plain.data ?? []) as BoardTask[];
    loadError = plain.error?.message ?? null;
  }

  return (
    <TaskBoard
      tasks={rows}
      loadError={loadError}
      nowIso={new Date().toISOString()}
    />
  );
}
