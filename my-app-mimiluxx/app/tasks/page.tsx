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

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, description, status, due_date, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <TaskBoard
      tasks={(tasks ?? []) as BoardTask[]}
      loadError={error?.message ?? null}
      nowIso={new Date().toISOString()}
    />
  );
}
